<template>
  <div class="fixed bottom-0 left-0 right-0 p-4 flex justify-center">
    <div class="chat-container bg-cyan-800 text-white p-4 rounded-t-lg shadow-lg w-full max-w-4xl">
      <!-- Title -->
      <div class="text-center mb-4">
        <h1 class="text-xl font-bold text-blue-400">Anthropic Web Based Chat Bot</h1>
      </div>

      <!-- Display area for chat history with dynamic height -->
      <div
        ref="chatHistoryRef"
        class="chat-history overflow-y-auto p-3 bg-gray-900 rounded-lg mb-4 relative custom-scrollbar scroll-instant"
        :style="chatHistoryHeight"
        @scroll="handleScroll"
      >
        <!-- Initial welcome message -->
        <div class="AI mb-4">
          <strong>AI:</strong> Hi, how can I help you?
        </div>
        
        <div v-for="(entry, index) in chatHistory" :key="index" :class="entry.sender">
          <strong>{{ entry.sender }}:</strong> {{ entry.message }}
        </div>

        <!-- Loading indicator -->
        <div v-if="isLoading" class="loading-message">
          <div class="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>

      <!-- Input field for user messages and Send button -->
      <div class="chat-input flex">
        <input
          ref="messageInputRef" 
          v-model="messageInput"
          type="text"
          placeholder="Type your message..."
          class="flex-1 p-2 bg-gray-700 text-white rounded-l-lg focus:outline-none"
          @keyup.enter="sendMessage"
          :disabled="isLoading"
        />
        <button
          @click="sendMessage"
          class="p-2 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          :disabled="isLoading || !messageInput.trim()"
        >
          <span v-if="isLoading">
            Sending...
          </span>
          <span v-else>
            Send
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, nextTick, onMounted, computed } from 'vue'; // <-- Added 'computed' import here

export default {
  setup() {
    const messageInput = ref('');
    const chatHistory = ref([]);
    const chatHistoryRef = ref(null);
    const messageInputRef = ref(null); // New ref for the input field
    const isNearBottom = ref(true);
    const isLoading = ref(false);

    const chatHistoryHeight = computed(() => {
      return { height: 'calc(100vh - 200px)' };  // Dynamically set height
    });

    const handleScroll = () => {
      const element = chatHistoryRef.value;
      if (element) {
        isNearBottom.value = element.scrollHeight - element.scrollTop <= element.clientHeight + 100;
      }
    };

    const scrollToBottom = () => {
      const element = chatHistoryRef.value;
      if (element) {
        element.scrollTop = element.scrollHeight;
      }
    };

    const sendMessage = async () => {
      if (messageInput.value.trim() !== '' && !isLoading.value) {
        isLoading.value = true;
        
        chatHistory.value.push({
          sender: 'User',
          message: messageInput.value,
        });

        const userMessage = messageInput.value;
        messageInput.value = '';

        nextTick(scrollToBottom);

        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: userMessage }),
          });

          const data = await response.json();
          if (data.reply && data.reply.content) {
            const aiMessage = data.reply.content[0].text;
            chatHistory.value.push({
              sender: 'AI',
              message: aiMessage,
            });
            
            if (isNearBottom.value) {
              nextTick(scrollToBottom);
            }

            // Focus on the input field after response
            nextTick(() => {
              messageInputRef.value.focus(); // Focus input field
            });
          } else {
            chatHistory.value.push({
              sender: 'Error',
              message: 'No valid reply from AI.',
            });
          }
        } catch (error) {
          chatHistory.value.push({
            sender: 'Error',
            message: 'Failed to get response from AI.',
          });
        } finally {
          isLoading.value = false;
        }
      }
    };

    // Adjust chat height on window resize
    const handleResize = () => {
      scrollToBottom();
    };

    onMounted(() => {
      window.addEventListener('resize', handleResize);
      scrollToBottom();
    });

    return {
      messageInput,
      chatHistory,
      chatHistoryRef,
      messageInputRef, // Bind the new ref
      isLoading,
      sendMessage,
      handleScroll,
      chatHistoryHeight,
    };
  },
};
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  min-height: 300px;
  max-height: 90vh;
}

.User {
  text-align: right;
  color: #63b3ed;
  margin-bottom: 8px;
  padding: 8px;
  background: rgba(99, 179, 237, 0.1);
  border-radius: 8px;
}

.AI {
  text-align: left;
  color: #ffffff; /* Changed from #a3e635 to white */
  margin-bottom: 8px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.1); /* Changed from green to white background with lower opacity */
  border-radius: 8px;
}

.Error {
  text-align: center;
  color: #ef4444;
  margin-bottom: 8px;
  padding: 8px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 8px;
}

.loading-message {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
}

.loading-dots {
  display: flex;
  gap: 4px;
}

.loading-dots span {
  width: 8px;
  height: 8px;
  background-color: #ffffff; /* Changed loading dots to white */
  border-radius: 50%;
  animation: loading 1.4s infinite ease-in-out both;
}

.loading-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.loading-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes loading {
  0%, 80%, 100% { 
    transform: scale(0);
  }
  40% { 
    transform: scale(1.0);
  }
}

.scroll-instant {
  scroll-behavior: auto !important;
  -webkit-overflow-scrolling: touch;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
}

.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
}

@media (max-width: 768px) {
  .chat-container {
    max-width: 100% !important;
    margin: 0;
  }
}
</style>
