import Message from '../models/Message.js';

// Map to store active socket mappings: userId -> socketId
const userSocketMap = new Map();

// Helper to get socket ID of a user
export const getSocketIdByUserId = (userId) => {
  return userSocketMap.get(userId);
};

export const initSocketHandler = (io) => {
  io.on('connection', (socket) => {
    let currentUserId = null;

    // Identify user connection
    socket.on('identify', (userId) => {
      if (!userId) return;
      currentUserId = userId;
      userSocketMap.set(userId, socket.id);
      
      // Broadcast online status to all users
      io.emit('user_online', { userId });
    });

    // Handle sending a private message
    socket.on('private_message', async ({ recipientId, text }) => {
      if (!currentUserId || !recipientId || !text) return;

      try {
        // Create and save message
        const newMessage = new Message({
          sender: currentUserId,
          recipient: recipientId,
          text
        });
        await newMessage.save();

        // Check if recipient is online
        const recipientSocketId = userSocketMap.get(recipientId);
        if (recipientSocketId) {
          // Emit to recipient
          io.to(recipientSocketId).emit('msg_receive', newMessage);
        }

        // Emit back to sender
        socket.emit('msg_sent', newMessage);
      } catch (error) {
        console.error('Socket message save error:', error);
      }
    });

    // Handle typing indicators
    socket.on('typing', ({ recipientId, isTyping }) => {
      if (!currentUserId || !recipientId) return;

      const recipientSocketId = userSocketMap.get(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('user_typing', {
          senderId: currentUserId,
          isTyping
        });
      }
    });

    // Handle read receipts
    socket.on('read_receipt', async ({ senderId }) => {
      if (!currentUserId || !senderId) return;

      try {
        // Update DB
        await Message.updateMany(
          { sender: senderId, recipient: currentUserId, read: false },
          { $set: { read: true } }
        );

        // Notify the sender that their messages to currentUserId have been read
        const senderSocketId = userSocketMap.get(senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit('messages_read', {
            readBy: currentUserId
          });
        }
      } catch (error) {
        console.error('Socket read receipt error:', error);
      }
    });

    // Handle checking online status of specific users
    socket.on('check_online', ({ userIds }, callback) => {
      if (!Array.isArray(userIds)) return;
      const statusMap = {};
      userIds.forEach(id => {
        statusMap[id] = userSocketMap.has(id);
      });
      if (typeof callback === 'function') {
        callback(statusMap);
      }
    });

    // Handle user disconnect
    socket.on('disconnect', () => {
      if (currentUserId) {
        userSocketMap.delete(currentUserId);
        // Broadcast offline status
        io.emit('user_offline', { userId: currentUserId });
      }
    });
  });
};
