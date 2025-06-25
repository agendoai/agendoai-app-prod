// Define global types for the application

declare global {
  /**
   * Send a real-time notification to a specific user
   * @param userId The ID of the user to receive the notification
   * @param notification The notification data to send
   * @returns boolean indicating if the notification was sent successfully
   */
  function sendNotification(userId: number, notification: any): boolean;
}

export {};