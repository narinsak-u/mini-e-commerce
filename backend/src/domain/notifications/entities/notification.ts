/**
 * Represents an in-app notification for a user.
 *
 * **Properties:**
 * - `type` — discriminator for notification category (`payment_success`, etc.)
 * - `read` — boolean flag, toggled via the mark-as-read API
 * - `body` — optional longer description (null for title-only notifications)
 */
export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  createdAt: Date;
}
