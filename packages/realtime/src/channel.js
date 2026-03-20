/**
 * Channel/room abstraction for managing named channels with members.
 */

/**
 * Creates a channel manager for organizing clients into named channels.
 */
export function createChannelManager() {
  const channels = new Map();

  function createChannel(name) {
    if (channels.has(name)) return channels.get(name);
    const channel = { name, members: new Set(), metadata: {} };
    channels.set(name, channel);
    return channel;
  }

  function join(channelName, clientId) {
    let channel = channels.get(channelName);
    if (!channel) {
      channel = createChannel(channelName);
    }
    channel.members.add(clientId);
    return true;
  }

  function leave(channelName, clientId) {
    const channel = channels.get(channelName);
    if (!channel) return false;
    const removed = channel.members.delete(clientId);
    return removed;
  }

  function broadcast(channelName, event, data, sendFn) {
    const channel = channels.get(channelName);
    if (!channel) return 0;
    let count = 0;
    for (const clientId of channel.members) {
      if (sendFn(clientId, event, data)) count++;
    }
    return count;
  }

  function getMembers(channelName) {
    const channel = channels.get(channelName);
    if (!channel) return [];
    return Array.from(channel.members);
  }

  function deleteChannel(channelName) {
    return channels.delete(channelName);
  }

  function getChannels() {
    return Array.from(channels.keys());
  }

  function removeFromAll(clientId) {
    let count = 0;
    for (const channel of channels.values()) {
      if (channel.members.delete(clientId)) count++;
    }
    return count;
  }

  return {
    createChannel,
    join,
    leave,
    broadcast,
    getMembers,
    deleteChannel,
    getChannels,
    removeFromAll,
  };
}
