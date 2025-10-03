import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ReviewModalProps {
  booking: any;
  isOpen: boolean;
  onClose: () => void;
  onReviewSubmitted: () => void;
}

const ReviewModal = ({ booking, isOpen, onClose, onReviewSubmitted }: ReviewModalProps) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setSubmitting(true);

    try {
      // Check if review already exists for this booking
      const { data: existingReview, error: checkError } = await supabase
        .from('reviews')
        .select('id')
        .eq('booking_id', booking.id)
        .eq('customer_id', booking.customer_id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw checkError;
      }

      if (existingReview) {
        toast.error("You have already submitted a review for this service");
        setSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from('reviews')
        .insert({
          booking_id: booking.id,
          customer_id: booking.customer_id,
          provider_id: booking.provider_id,
          rating,
          comment
        });

      if (error) {
        throw error;
      }

      toast.success("Review submitted successfully! Thank you for your feedback.");
      onReviewSubmitted();
      onClose();
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast.error("Failed to submit review: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Rate Your Service
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <Label className="text-blue-900 font-semibold">Service: {booking?.title}</Label>
            <p className="text-sm text-blue-700 mt-1">How would you rate this service?</p>
            <p className="text-xs text-blue-600 mt-2">
              Provider: {booking?.provider_profiles?.business_name || 'Service Provider'}
            </p>
          </div>
          
          <div className="flex justify-center space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-8 w-8 cursor-pointer ${
                  star <= (hoverRating || rating)
                    ? "text-yellow-400 fill-yellow-400"
                    : "text-gray-300"
                }`}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
              />
            ))}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="comment">Comment (Optional)</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience with this service... What did you like? Any suggestions for improvement?"
              rows={4}
            />
            <p className="text-xs text-gray-500">
              💡 Helpful reviews mention: service quality, punctuality, communication, and overall satisfaction
            </p>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Review"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewModal;