import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, ArrowLeft } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "sonner";

interface Review {
  id: string;
  rating: number;
  comment?: string;
  created_at: string;
  bookings?: {
    title: string;
    customer_id: string;
    customer?: {
      full_name: string;
    };
  };
}

const RatingsHistory = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadRatingsHistory();
    }
  }, [isAuthenticated, user]);

  const loadRatingsHistory = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch reviews for this provider with booking and customer details
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          bookings (
            title,
            customer_id,
            customer:profiles!bookings_customer_id_fkey (
              full_name
            )
          )
        `)
        .eq('provider_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setReviews(data as unknown as Review[]);
        
        // Calculate average rating
        if (data.length > 0) {
          const totalRating = data.reduce((sum, review) => sum + review.rating, 0);
          setAverageRating(parseFloat((totalRating / data.length).toFixed(1)));
          setTotalReviews(data.length);
        }
      }
    } catch (error) {
      console.error('Error loading ratings history:', error);
      toast.error("Failed to load ratings history");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 ${
              star <= rating
                ? "text-yellow-400 fill-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-16 items-center px-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
            className="mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Ratings History</h1>
        </div>
      </header>

      <div className="container py-6">
        {/* Stats Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Your Ratings Overview</CardTitle>
            <CardDescription>
              See all customer reviews and ratings for your services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-center">
                <div className="text-4xl font-bold">{averageRating || "N/A"}</div>
                <div className="flex justify-center mt-2">
                  {renderStars(Math.round(averageRating))}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Average Rating
                </p>
              </div>
              
              <div className="h-12 w-px bg-border hidden md:block"></div>
              
              <div className="text-center">
                <div className="text-4xl font-bold">{totalReviews}</div>
                <p className="text-sm text-muted-foreground mt-2">
                  Total Reviews
                </p>
              </div>
              
              <div className="h-12 w-px bg-border hidden md:block"></div>
              
              <div className="text-center">
                <div className="text-4xl font-bold">
                  {reviews.filter(r => r.rating === 5).length}
                </div>
                <div className="flex justify-center mt-2">
                  {renderStars(5)}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  5-Star Reviews
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reviews List */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Reviews</CardTitle>
            <CardDescription>
              All reviews from customers who used your services
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reviews.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No reviews yet. Your customers will see this section after completing services.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {reviews.map((review) => (
                  <div key={review.id} className="border rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div>
                        <h3 className="font-semibold">
                          {review.bookings?.customer?.full_name || "Anonymous Customer"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Service: {review.bookings?.title || "N/A"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {renderStars(review.rating)}
                        <span className="text-sm font-medium">{review.rating}.0</span>
                      </div>
                    </div>
                    
                    {review.comment && (
                      <p className="text-muted-foreground mb-3">{review.comment}</p>
                    )}
                    
                    <p className="text-xs text-muted-foreground">
                      Reviewed on {formatDate(review.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RatingsHistory;