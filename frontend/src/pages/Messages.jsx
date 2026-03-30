import { useEffect, useMemo, useState } from 'react';
import { connectionAPI, messageAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const encodeToCiphertext = (input) => {
  try {
    return btoa(unescape(encodeURIComponent(input)));
  } catch {
    return input;
  }
};

const decodeCiphertext = (input) => {
  try {
    return decodeURIComponent(escape(atob(input)));
  } catch {
    return input;
  }
};

const getApiErrorMessage = (error, fallbackMessage) => {
  const detail = error?.response?.data?.detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => item?.msg || 'Validation error').join(', ');
  }
  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }
  return fallbackMessage;
};

const Messages = () => {
  const { user } = useAuth();

  const [friends, setFriends] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFriendId, setActiveFriendId] = useState(null);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [activeConversationTitle, setActiveConversationTitle] = useState('');
  const [activeConversationSubtitle, setActiveConversationSubtitle] = useState('');
  const [messageInput, setMessageInput] = useState('');

  const [groupName, setGroupName] = useState('');
  const [groupMemberIds, setGroupMemberIds] = useState([]);

  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadSidebarData();
    loadConversations();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      searchUsers(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const friendMap = useMemo(
    () =>
      friends.reduce((map, friend) => {
        map[friend.id] = friend;
        return map;
      }, {}),
    [friends]
  );

  const conversationMapByFriendId = useMemo(() => {
    const map = {};
    conversations.forEach((conversation) => {
      if (conversation.is_group) {
        return;
      }
      const otherUserId = (conversation.participant_ids || []).find((participantId) => participantId !== user?.id);
      if (otherUserId) {
        map[otherUserId] = conversation;
      }
    });
    return map;
  }, [conversations, user?.id]);

  const groupConversations = useMemo(
    () => (conversations || []).filter((conversation) => conversation.is_group),
    [conversations]
  );

  const loadSidebarData = async () => {
    try {
      setError('');
      const [friendsResponse, receivedResponse, sentResponse] = await Promise.all([
        connectionAPI.listFriends(),
        connectionAPI.listReceivedRequests(),
        connectionAPI.listSentRequests(),
      ]);
      setFriends(friendsResponse.data || []);
      setReceivedRequests(receivedResponse.data || []);
      setSentRequests(sentResponse.data || []);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load connection data'));
    }
  };

  const loadConversations = async () => {
    try {
      const response = await messageAPI.listConversations();
      setConversations(response.data || []);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load conversations'));
    }
  };

  const searchUsers = async (query) => {
    try {
      const response = await connectionAPI.searchUsers({ query, limit: 20 });
      setSearchResults(response.data || []);
    } catch {
      setSearchResults([]);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      setLoadingMessages(true);
      const response = await messageAPI.listMessages(conversationId);
      setMessages(response.data || []);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load messages'));
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendRequest = async (recipientId) => {
    try {
      setError('');
      setSuccess('');
      await connectionAPI.sendRequest(recipientId);
      setSuccess('Connection request sent');
      await loadSidebarData();
      if (searchQuery.trim()) {
        await searchUsers(searchQuery.trim());
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to send connection request'));
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      setError('');
      setSuccess('');
      await connectionAPI.acceptRequest(requestId);
      setSuccess('Connection request accepted');
      await loadSidebarData();
      await loadConversations();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to accept request'));
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      setError('');
      setSuccess('');
      await connectionAPI.rejectRequest(requestId);
      setSuccess('Connection request rejected');
      await loadSidebarData();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to reject request'));
    }
  };

  const handleRemoveFriend = async (friendId) => {
    try {
      setError('');
      setSuccess('');
      await connectionAPI.removeFriend(friendId);
      if (activeFriendId === friendId) {
        setActiveFriendId(null);
        setActiveConversationId(null);
        setActiveConversationTitle('');
        setActiveConversationSubtitle('');
        setMessages([]);
      }
      setSuccess('Friend removed');
      await loadSidebarData();
      await loadConversations();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to remove friend'));
    }
  };

  const openChatWithFriend = async (friendId) => {
    try {
      setError('');
      setSuccess('');
      setActiveFriendId(friendId);

      let conversation = conversationMapByFriendId[friendId];
      if (!conversation) {
        const response = await messageAPI.createConversation({
          participant_ids: [friendId],
          is_group: false,
          name: null,
        });
        conversation = response.data;
        await loadConversations();
      }

      setActiveConversationId(conversation.id);
      setActiveConversationTitle(friendMap[friendId]?.full_name || `User #${friendId}`);
      setActiveConversationSubtitle(friendMap[friendId]?.headline || friendMap[friendId]?.role || 'Connected friend');
      await loadMessages(conversation.id);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to open chat. Ensure you are connected first.'));
    }
  };

  const openGroupConversation = async (conversation) => {
    try {
      setError('');
      setSuccess('');
      setActiveFriendId(null);
      setActiveConversationId(conversation.id);
      setActiveConversationTitle(conversation.name || `Group #${conversation.id}`);
      setActiveConversationSubtitle(`${(conversation.participant_ids || []).length} participants`);
      await loadMessages(conversation.id);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to open group conversation'));
    }
  };

  const toggleGroupMember = (friendId) => {
    setGroupMemberIds((previous) =>
      previous.includes(friendId) ? previous.filter((id) => id !== friendId) : [...previous, friendId]
    );
  };

  const handleCreateGroup = async (event) => {
    event.preventDefault();
    if (groupMemberIds.length < 2) {
      setError('Select at least 2 friends to create a group chat.');
      return;
    }

    try {
      setError('');
      setSuccess('');
      const response = await messageAPI.createConversation({
        participant_ids: groupMemberIds,
        is_group: true,
        name: groupName.trim() || null,
      });
      setGroupName('');
      setGroupMemberIds([]);
      setSuccess('Group conversation created');
      await loadConversations();
      await openGroupConversation(response.data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to create group conversation'));
    }
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();
    if (!activeConversationId || !messageInput.trim()) {
      return;
    }

    try {
      setSending(true);
      setError('');
      await messageAPI.sendMessage(activeConversationId, {
        ciphertext: encodeToCiphertext(messageInput.trim()),
        message_type: 'e2ee',
      });
      setMessageInput('');
      await loadMessages(activeConversationId);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to send message'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="li-card p-6">
        <h1 className="li-title">Messaging</h1>
        <p className="li-subtitle mt-2">Connect with professionals and chat like a real inbox experience.</p>
      </div>

      {error && <div className="li-card border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="li-card border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <aside className="li-card overflow-hidden lg:col-span-4">
          <div className="p-4 border-b border-gray-200 space-y-3">
            <p className="text-sm font-semibold text-gray-900">Add Connection</p>
            <input
              className="li-input"
              placeholder="Search by name or email"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            {searchResults.length > 0 && (
              <div className="max-h-44 overflow-y-auto space-y-2">
                {searchResults.map((result) => (
                  <div key={result.id} className="rounded-lg border border-gray-200 p-2 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{result.full_name}</p>
                      <p className="text-xs text-gray-500">{result.headline || result.role}</p>
                    </div>
                    {result.connection_status === 'none' ? (
                      <button className="li-btn-secondary !py-1 !px-3" onClick={() => handleSendRequest(result.id)}>Add</button>
                    ) : (
                      <span className="text-xs text-gray-500 capitalize">{result.connection_status.replace('_', ' ')}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-b border-gray-200">
            <p className="text-sm font-semibold text-gray-900 mb-2">Requests</p>
            {receivedRequests.length === 0 ? (
              <p className="text-xs text-gray-500">No pending requests</p>
            ) : (
              <div className="space-y-2">
                {receivedRequests.map((request) => (
                  <div key={request.id} className="rounded-lg border border-gray-200 p-2 flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-700">User #{request.requester_id}</span>
                    <div className="flex gap-1">
                      <button className="li-btn-primary !py-1 !px-3" onClick={() => handleAcceptRequest(request.id)}>Accept</button>
                      <button className="li-btn-secondary !py-1 !px-3" onClick={() => handleRejectRequest(request.id)}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {sentRequests.length > 0 && <p className="text-xs text-gray-500 mt-2">Sent requests: {sentRequests.length}</p>}
          </div>

          <form onSubmit={handleCreateGroup} className="p-4 border-b border-gray-200 space-y-2">
            <p className="text-sm font-semibold text-gray-900">Create Group</p>
            <input
              className="li-input"
              placeholder="Group name (optional)"
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
            />
            <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
              {friends.length === 0 ? (
                <p className="text-xs text-gray-500">Add friends first</p>
              ) : (
                friends.map((friend) => (
                  <label key={friend.id} className="flex items-center gap-2 text-xs text-gray-700">
                    <input type="checkbox" checked={groupMemberIds.includes(friend.id)} onChange={() => toggleGroupMember(friend.id)} />
                    <span>{friend.full_name}</span>
                  </label>
                ))
              )}
            </div>
            <button type="submit" className="li-btn-primary !py-1.5 !px-3" disabled={friends.length === 0}>Create Group Chat</button>
          </form>

          <div className="p-4 border-b border-gray-200">
            <p className="text-sm font-semibold text-gray-900 mb-2">Friends</p>
            {friends.length === 0 ? (
              <p className="text-sm text-gray-500">No connections yet.</p>
            ) : (
              <div className="space-y-2">
                {friends.map((friend) => (
                  <div
                    key={friend.id}
                    className={`rounded-lg border p-3 transition-colors ${
                      activeFriendId === friend.id ? 'border-[#0a66c2] bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button type="button" className="text-left" onClick={() => openChatWithFriend(friend.id)}>
                        <p className="text-sm font-semibold text-gray-900">{friend.full_name}</p>
                        <p className="text-xs text-gray-500">{friend.headline || friend.role}</p>
                      </button>
                      <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => handleRemoveFriend(friend.id)}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4">
            <p className="text-sm font-semibold text-gray-900 mb-2">Groups</p>
            {groupConversations.length === 0 ? (
              <p className="text-sm text-gray-500">No groups yet.</p>
            ) : (
              <div className="space-y-2">
                {groupConversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => openGroupConversation(conversation)}
                    className={`w-full text-left rounded-lg border p-3 transition-colors ${
                      activeConversationId === conversation.id ? 'border-[#0a66c2] bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <p className="text-sm font-semibold text-gray-900">{conversation.name || `Group #${conversation.id}`}</p>
                    <p className="text-xs text-gray-500">{(conversation.participant_ids || []).length} participants</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        <section className="li-card overflow-hidden lg:col-span-8 flex flex-col min-h-[520px]">
          <div className="px-4 py-3 border-b border-gray-200 bg-white">
            <p className="text-sm font-semibold text-gray-900">{activeConversationTitle || 'Select a friend or group to chat'}</p>
            <p className="text-xs text-gray-500">{activeConversationSubtitle || 'Only connected friends can be messaged'}</p>
          </div>

          <div className="flex-1 p-4 bg-[#f7f9fb] overflow-y-auto space-y-3">
            {!activeConversationId ? (
              <div className="text-sm text-gray-500">Choose a connection or group from the left panel to start chatting.</div>
            ) : loadingMessages ? (
              <div className="text-sm text-gray-500">Loading messages...</div>
            ) : messages.length === 0 ? (
              <div className="text-sm text-gray-500">No messages yet. Say hello 👋</div>
            ) : (
              messages.map((message) => {
                const isMine = message.sender_id === user?.id;
                return (
                  <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${isMine ? 'bg-[#0a66c2] text-white' : 'bg-white text-gray-800 border border-gray-200'}`}>
                      <p className="whitespace-pre-wrap break-words">{decodeCiphertext(message.ciphertext)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-200 bg-white flex items-end gap-2">
            <textarea
              className="li-input"
              rows={2}
              placeholder={activeConversationId ? 'Write a message...' : 'Select a friend or group to start chatting'}
              value={messageInput}
              onChange={(event) => setMessageInput(event.target.value)}
              disabled={!activeConversationId || sending}
            />
            <button type="submit" className="li-btn-primary whitespace-nowrap" disabled={!activeConversationId || sending || !messageInput.trim()}>
              {sending ? 'Sending...' : 'Send'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default Messages;
