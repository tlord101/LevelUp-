import { Resend } from 'resend';

/**
 * =============================================================================
 * Resend Email & Notification Service
 * =============================================================================
 * Handles email delivery via Resend.com and provides hooks for push notifications.
 * Note: Resend is primarily for Emails. Push notifications are typically handled
 * via FCM (Firebase Cloud Messaging).
 */

// Initialize Resend with your API Key
// In production, use import.meta.env.VITE_RESEND_API_KEY
const resend = new Resend('re_123456789'); // Placeholder for development

/**
 * Sends an email using Resend.
 */
export const sendEmailNotification = async (to: string, subject: string, html: string) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'LevelUp <notifications@yourdomain.com>',
      to: [to],
      subject: subject,
      html: html,
    });

    if (error) {
      console.error('Resend Error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Resend Exception:', err);
    return { success: false, error: err };
  }
};

/**
 * Template for daily scan reminders.
 */
export const sendScanReminderEmail = async (userEmail: string, userName: string) => {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #4F46E5;">Time for your daily scan! 🚀</h2>
      <p>Hi ${userName},</p>
      <p>Consistency is key to reaching your fitness goals. Don't forget to complete your scans today:</p>
      <ul>
        <li>Face Scan (Skin health tracking)</li>
        <li>Body Scan (Progress visualization)</li>
        <li>Food Scan (Nutrition logging)</li>
      </ul>
      <p>Open LevelUp and let's get it done!</p>
      <div style="margin-top: 20px;">
        <a href="https://your-app-url.com/scanners" style="background: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Scanners</a>
      </div>
    </div>
  `;
  
  return sendEmailNotification(userEmail, "Daily Scan Reminder - LevelUp", html);
};
