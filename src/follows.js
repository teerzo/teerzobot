import { EventSubWsListener } from '@twurple/eventsub-ws';

export async function startFollowAlerts({ apiClient, twitchApi, botUserId, onFollow }) {
    const broadcasterId = await twitchApi.getBroadcasterId();
    const listener = new EventSubWsListener({ apiClient });

    listener.onChannelFollow(broadcasterId, botUserId, (event) => {
        onFollow({
            user: event.userName,
            displayName: event.userDisplayName,
            userId: event.userId,
        });
    });

    listener.start();
    console.log('Listening for channel follows');
    return listener;
}
