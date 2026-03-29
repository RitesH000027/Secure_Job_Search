import { useEffect, useState } from 'react';
import { messageAPI } from '../services/api';

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

const Messages = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);

  const [participantInput, setParticipantInput] = useState('');
  const [isGroup, setIsGroup] = useState(false);
  const [conversationName, setConversationName] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [messageType, setMessageType] = useState('e2ee');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const response = await messageAPI.listConversations();
      setConversations(response.data || []);
    } catch {
      setError('Failed to load conversations');
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      const response = await messageAPI.listMessages(conversationId);
      setMessages(response.data || []);
      setSelectedConversation(conversationId);
    } catch {
      setError('Failed to load messages');
    }
  };

  const handleCreateConversation = async (event) => {
    event.preventDefault();
    try {
      setError('');
      const participantIds = participantInput
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => Number(value));

      await messageAPI.createConversation({
        participant_ids: participantIds,
        is_group: isGroup,
        name: conversationName || null,
      });

      setParticipantInput('');
      setConversationName('');
      setSuccess('Conversation created');
      await loadConversations();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create conversation');
    }
  };

  const handleSend = async (event) => {
    event.preventDefault();
    if (!selectedConversation || !messageInput) {
      return;
    }

    try {
      setError('');
      await messageAPI.sendMessage(selectedConversation, {
        ciphertext: encodeToCiphertext(messageInput),
        message_type: messageType,
      });
      setMessageInput('');
      await loadMessages(selectedConversation);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send message');
    }
  };

  return (
    <div className="space-y-5">
      <div className="li-card p-6">
        <h1 className="li-title">Messaging</h1>
        <p className="li-subtitle mt-2">Start secure conversations and exchange ciphertext-protected messages.</p>
      </div>

      {error && <div className="li-card border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="li-card border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</div>}

      <form onSubmit={handleCreateConversation} className="li-card p-5 space-y-3">
        <h2 className="text-base font-semibold text-gray-900">Create Conversation</h2>
        <input
          className="li-input"
          placeholder="Participant user IDs (comma-separated)"
          value={participantInput}
          onChange={(e) => setParticipantInput(e.target.value)}
          required
        />
        <input
          className="li-input"
          placeholder="Conversation name (optional)"
          value={conversationName}
          onChange={(e) => setConversationName(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={isGroup} onChange={(e) => setIsGroup(e.target.checked)} />
          Group conversation
        </label>
        <button className="li-btn-primary" type="submit">Create</button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="li-card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 text-sm font-semibold text-gray-900">Conversations</div>
          {conversations.length === 0 ? (
            <div className="p-4 text-sm text-gray-600">No conversations yet.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => loadMessages(conversation.id)}
                  className={`w-full text-left p-4 text-sm hover:bg-gray-50 transition-colors ${selectedConversation === conversation.id ? 'bg-blue-50 border-l-4 border-[#0a66c2]' : ''}`}
                >
                  <p className="font-semibold text-gray-900">{conversation.name || `Conversation #${conversation.id}`}</p>
                  <p className="text-xs text-gray-600 mt-1">Participants: {conversation.participant_ids.join(', ')}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="md:col-span-2 li-card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 text-sm font-semibold text-gray-900">Messages</div>
          <div className="p-4 space-y-3 max-h-96 overflow-y-auto bg-gradient-to-b from-white to-gray-50">
            {messages.length === 0 ? (
              <div className="text-sm text-gray-600">Select a conversation to view messages.</div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="rounded-xl border border-gray-200 bg-white p-3 text-sm shadow-sm">
                  <div className="text-xs text-gray-500 mb-1">Sender #{message.sender_id} • {message.message_type}</div>
                  <div className="font-mono break-all text-gray-800">{message.ciphertext}</div>
                  <div className="text-xs text-gray-500 mt-1">Preview: {decodeCiphertext(message.ciphertext)}</div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSend} className="border-t border-gray-200 p-4 space-y-2">
            <select className="li-input" value={messageType} onChange={(e) => setMessageType(e.target.value)}>
              <option value="e2ee">E2EE (client ciphertext)</option>
              <option value="server_encrypted">Server encrypted</option>
            </select>
            <textarea
              className="li-input"
              rows={3}
              placeholder="Type message"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
            />
            <button type="submit" className="li-btn-primary" disabled={!selectedConversation}>
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Messages;
