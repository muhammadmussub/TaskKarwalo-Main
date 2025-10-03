import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, MessageSquare } from "lucide-react";

interface RejectionReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading?: boolean;
  offerPrice: number;
  serviceTitle: string;
}

export const RejectionReasonModal = ({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  offerPrice,
  serviceTitle
}: RejectionReasonModalProps) => {
  const [reason, setReason] = useState("");

  const handleSubmit = () => {
    if (reason.trim()) {
      onConfirm(reason.trim());
      setReason("");
    }
  };

  const handleClose = () => {
    setReason("");
    onClose();
  };

  const commonReasons = [
    "Price is too high",
    "Need more time to consider",
    "Found a better option",
    "Service doesn't meet requirements",
    "Scheduling conflict",
    "Other"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-orange-600 mb-2">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle>Reject Offer</DialogTitle>
          </div>
          <p className="text-sm text-gray-600">
            Please provide a reason for rejecting this offer. This helps the provider improve their services.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="rejection-reason" className="text-sm font-medium">
              Reason for rejection <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="rejection-reason"
              placeholder="Please explain why you're rejecting this offer..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 min-h-[100px] resize-none"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {reason.length}/200 characters
            </p>
          </div>

          {/* Common reasons for quick selection */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Quick select:
            </Label>
            <div className="grid grid-cols-1 gap-2">
              {commonReasons.map((commonReason) => (
                <Button
                  key={commonReason}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="justify-start text-left h-auto py-2 px-3 text-xs"
                  onClick={() => setReason(commonReason)}
                >
                  {commonReason}
                </Button>
              ))}
            </div>
          </div>

          {/* Service info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-blue-800 mb-1">
              <MessageSquare className="h-4 w-4" />
              <span className="font-medium text-sm">Offer Details</span>
            </div>
            <p className="text-sm text-blue-700">
              <strong>Service:</strong> {serviceTitle}
            </p>
            <p className="text-sm text-blue-700">
              <strong>Offered Price:</strong> PKR {offerPrice.toLocaleString()}
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !reason.trim()}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? "Rejecting..." : "Reject Offer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};