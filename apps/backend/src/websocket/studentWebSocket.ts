import { Server, Socket } from 'socket.io';
import Question from '../web/models/question.model';
// import HostSettings from '../models/HostSettings';

let io: Server;

export const initializeStudentSocket = (server: any) => {
  io = new Server(server, {
    cors: {
      origin: ['http://localhost:5173', 'http://localhost:3000'], // Add frontend URLs
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log('✅ Student connected:', socket.id);

    // Handle joining a room (for future use)
    socket.on('join-room', (roomId: string) => {
      socket.join(roomId);
      console.log(`Student ${socket.id} joined room ${roomId}`);
    });

    // Handle poll responses
    socket.on('poll-response', (data: any) => {
      console.log('📝 Poll response received:', data);
      // Handle the response logic here
    });

    // Send initial data when client connects
    socket.on('request-initial-data', async () => {
      try {
        const questions = await Question.find({
          is_active: true,
          is_approved: true,
        });
        socket.emit('initial-data', {
          questions: questions,
          timestamp: new Date().toISOString(),
        });
        console.log(`📤 Sent initial data to ${socket.id}`);
      } catch (error) {
        console.error('❌ Error sending initial data:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log('❌ Student disconnected:', socket.id);
    });
  });

  console.log('🔌 Socket.IO server initialized');
};

// function to emit question based on host settings
export const sendPollToStudents = async () => {
  try {
    const questions = await Question.aggregate([
      { $match: { is_active: true, is_approved: true } },
      // { $sample: { size: 5 } },
    ]);

    console.log('📤 Sending poll to students:', questions.length, 'questions');
    io.emit('poll', questions); // send to all connected clients

    return { success: true, questionsCount: questions.length };
  } catch (error) {
    console.error('❌ Error sending poll to students:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Utility functions to broadcast data changes
export const broadcastQuestionAdded = (question: any) => {
  if (io) {
    io.emit('question-added', {
      type: 'insert',
      collection: 'questions',
      data: question,
      timestamp: new Date().toISOString(),
    });
    console.log('📤 Broadcasted new question to all clients');
  }
};

export const broadcastQuestionUpdated = (question: any) => {
  if (io) {
    io.emit('question-updated', {
      type: 'update',
      collection: 'questions',
      data: question,
      timestamp: new Date().toISOString(),
    });
    console.log('📤 Broadcasted question update to all clients');
  }
};

export const broadcastQuestionDeleted = (questionId: string) => {
  if (io) {
    io.emit('question-deleted', {
      type: 'delete',
      collection: 'questions',
      id: questionId,
      timestamp: new Date().toISOString(),
    });
    console.log('📤 Broadcasted question deletion to all clients');
  }
};

export const broadcastToRoom = (roomId: string, event: string, data: any) => {
  if (io) {
    io.to(roomId).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
    console.log(`📤 Broadcasted ${event} to room ${roomId}`);
  }
};

// Export the socket instance for external use
export const getSocketInstance = () => {
  if (!io) {
    throw new Error('Socket.IO server not initialized');
  }
  return io;
};

export const handleStudentConnection = (socket: Socket) => {
  console.log('Student connected:', socket.id);

  // Handle student-specific events
  socket.on('join-poll', (pollId: string) => {
    socket.join(`poll-${pollId}`);
    console.log(`Student ${socket.id} joined poll ${pollId}`);
  });

  socket.on('disconnect', () => {
    console.log('Student disconnected:', socket.id);
  });
};
