<template>
  <div class="fixed bottom-0 left-0 right-0 p-4 flex justify-center">
    <div class="chat-container bg-gray-800 text-white p-4 rounded-t-lg shadow-lg w-full max-w-4xl">
      <!-- Title -->
      <div class="text-center mb-4">
        <h1 class="text-xl font-bold text-blue-400">Anthropic Web-Based Chat Bot</h1>
      </div>

      <!-- Chat History -->
      <div
        ref="chatHistoryRef"
        class="chat-history overflow-y-auto p-3 bg-gray-900 rounded-lg mb-4 custom-scrollbar"
        :style="{ height: 'calc(100vh - 200px)' }"
        @scroll="handleScroll"
      >
        <!-- Initial AI Message -->
        <div class="AI mb-4">
          <strong>AI:</strong> Hi, how can I help you?
        </div>

        <!-- Chat Messages -->
        <div v-for="(entry, index) in chatHistory" :key="index" :class="entry.sender">
          <strong>{{ entry.sender }}:</strong>
          <div v-html="convertToMarkdown(entry.message)"></div>
        </div>

        <!-- Loading Indicator -->
        <div v-if="isLoading" class="loading-message">
          <div class="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>

      <!-- Input Area -->
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
          <span v-if="isLoading">Sending...</span>
          <span v-else>Send</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, nextTick } from "vue";
import { marked } from "marked";

export default {
  setup() {
    const messageInput = ref("");
    const chatHistory = ref([]);
    const chatHistoryRef = ref(null);
    const messageInputRef = ref(null);
    const isLoading = ref(false);
    const isNearBottom = ref(true);

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
      if (!messageInput.value.trim() || isLoading.value) return;

      isLoading.value = true;

      // Add user's message to chat history
      chatHistory.value.push({
        sender: "User",
        message: messageInput.value.trim(),
      });

      const userMessage = messageInput.value.trim();
      messageInput.value = "";

      // Scroll to the bottom of the chat
      nextTick(scrollToBottom);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: userMessage }),
        });

        const data = await response.json();

        if (data.reply?.content?.[0]?.text) {
          chatHistory.value.push({
            sender: "AI",
            message: data.reply.content[0].text,
          });
        } else {
          chatHistory.value.push({
            sender: "Error",
            message: "No valid reply from the AI.",
          });
        }
      } catch (error) {
        chatHistory.value.push({
          sender: "Error",
          message: `An error occurred: ${error.message}`,
        });
      } finally {
        isLoading.value = false;
        if (isNearBottom.value) nextTick(scrollToBottom);
        nextTick(() => messageInputRef.value.focus());
      }
    };

    const convertToMarkdown = (text) => {
      try {
        return marked(text || "");
      } catch {
        return text;
      }
    };

    onMounted(() => {
      scrollToBottom();
    });

    return {
      messageInput,
      chatHistory,
      chatHistoryRef,
      isLoading,
      sendMessage,
      handleScroll,
      convertToMarkdown,
    };
  },
};
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
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
  color: #ffffff;
  margin-bottom: 8px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.1);
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
  text-align: center;
  padding: 1rem;
}

.loading-dots {
  display: inline-flex;
  gap: 4px;
}

.loading-dots span {
  width: 8px;
  height: 8px;
  background: white;
  border-radius: 50%;
  animation: loading 1.4s infinite;
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
    transform: scale(1);
  }
}

.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
}
</style>

