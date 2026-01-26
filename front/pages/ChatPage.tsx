import React from 'react';

interface ChatPageProps {
  eventId: number;
}

const ChatPage: React.FC<ChatPageProps> = ({ eventId }) => {
  return (
    <div className="p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-black text-white mb-8">チャット</h1>
        <div className="text-center py-12 text-gray-500">
          チャット機能は準備中です
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
