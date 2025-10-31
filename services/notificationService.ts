/**
 * =============================================================================
 * WARNING: FOR DEVELOPMENT & TESTING PURPOSES ONLY
 * =============================================================================
 * This file contains a function to send push notifications from the client-side.
 * This requires exposing a Firebase Server Key, which is highly insecure and
 * should NEVER be done in a production application.
 *
 * In a real-world scenario, push notifications must be triggered from a trusted
 * server environment (e.g., Cloud Functions, your own backend) where your
 * server key can be kept secret.
 *
 * This file is created solely for the purpose of a temporary, in-app tool to
 * test if the client-side FCM setup (service worker, token retrieval) is
 * working correctly.
 * =============================================================================
 */

/**
 * Sends a test push notification using the legacy FCM HTTP API.
 * @param token The FCM registration token of the target device.
 * @param title The title of the notification.
 * @param body The body message of the notification.
 */
export const sendTestPushNotification = async (token: string, title: string, body: string) => {
    // 1. Get this key from Firebase Console:
    //    Project Settings > Cloud Messaging > Cloud Messaging API (Legacy) > Server Key
    // 2. IMPORTANT: Ensure the "Cloud Messaging API (Legacy)" is ENABLED in your Google Cloud project.
    //    Go to https://console.cloud.google.com/apis/library/fcm.googleapis.com and enable it.
    const legacyServerKey = 'AAAA127tQG8:APA91bFwR-vJ2B15J5iR5e_WJbJg0wP2fK6o6V-G5v1x7X7t7j6e1H3n5q1O9L2n9s9g8f7d6e5c4b3a2';
    
    if (legacyServerKey.includes('YOUR_SERVER_KEY')) {
        throw new Error('Firebase Server Key is not configured in notificationService.ts. Please add it for testing.');
    }

    const message = {
        to: token,
        notification: {
            title: title,
            body: body,
            icon: "/vite.svg" 
        }
    };

    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
            'Authorization': `key=${legacyServerKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('FCM API Error:', errorData);
        throw new Error(`Failed to send notification. Status: ${response.status}. Message: ${errorData?.results?.[0]?.error || 'Unknown Error'}`);
    }

    const responseData = await response.json();
    console.log('FCM Send Response:', responseData);

    if (responseData.failure > 0) {
        const errorMessage = responseData.results[0].error;
        throw new Error(`FCM reported an error: ${errorMessage}`);
    }
};
