import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { notificationApi } from "@/core/api/endpoints";
import { NotificationFormData } from "@/core/types/notification.types";
import { toast } from "sonner";

export function NotificationForm() {
  const [formData, setFormData] = useState<NotificationFormData>({
    title: "",
    message: "",
    priority: "info",
    topic: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await notificationApi.sendNotification(formData);

      setFormData({
        title: "",
        message: "",
        priority: "info",
        topic: "",
      });
    } catch (error) {
      console.error("Failed to send notification:", error);
      toast.error("Failed to send notification", {
        description:
          "There was an error sending your notification. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      data-testid="notification-form"
    >
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          placeholder="Enter notification title"
          data-testid="notification-title-input"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          required
          rows={3}
          placeholder="Enter notification message"
          data-testid="notification-message-input"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="priority">Priority</Label>
        <Select
          id="priority"
          name="priority"
          value={formData.priority}
          onChange={handleChange}
          data-testid="notification-priority-select"
        >
          <option value="info">Info</option>
          <option value="error">Error</option>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="topic">Topic</Label>
        <Input
          id="topic"
          name="topic"
          value={formData.topic}
          onChange={handleChange}
          required
          placeholder="Enter notification topic"
          data-testid="notification-topic-input"
        />
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full"
        data-testid="notification-submit-button"
      >
        {isSubmitting ? "Sending..." : "Send Notification"}
      </Button>
    </form>
  );
}
