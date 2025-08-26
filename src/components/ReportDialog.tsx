import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Flag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ReportDialogProps {
  reportedUserId?: string;
  reportedPostId?: string;
  trigger?: React.ReactNode;
}

const ReportDialog: React.FC<ReportDialogProps> = ({ 
  reportedUserId, 
  reportedPostId, 
  trigger 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reportType, setReportType] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const reportTypes = [
    { value: 'spam', label: 'Spam or unwanted content' },
    { value: 'harassment', label: 'Harassment or bullying' },
    { value: 'hate_speech', label: 'Hate speech or discrimination' },
    { value: 'inappropriate', label: 'Inappropriate content' },
    { value: 'misinformation', label: 'False or misleading information' },
    { value: 'other', label: 'Other' }
  ];

  const handleSubmit = async () => {
    if (!reportType || !reason.trim()) {
      toast({
        variant: 'destructive',
        title: 'Please fill in all fields',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('reports')
        .insert({
          reporter_id: user?.id,
          reported_user_id: reportedUserId,
          reported_post_id: reportedPostId,
          report_type: reportType,
          reason: reason.trim()
        });

      if (error) throw error;

      toast({
        title: 'Report submitted',
        description: 'Thank you for helping keep our community safe. We\'ll review your report.',
      });

      setOpen(false);
      setReportType('');
      setReason('');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error submitting report',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            <Flag className="w-4 h-4 mr-2" />
            Report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report Content</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>What's the issue?</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {reportTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Additional details</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please provide more details about the issue..."
              rows={4}
            />
          </div>

          <div className="flex space-x-2">
            <Button 
              onClick={handleSubmit} 
              disabled={loading || !reportType || !reason.trim()}
              className="flex-1"
            >
              {loading ? 'Submitting...' : 'Submit Report'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDialog;