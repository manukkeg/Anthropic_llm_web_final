<template>
  <div class="fixed top-0 left-0 right-0 p-4 flex justify-center">
    <div class="chat-container bg-cyan-800 text-black p-4 rounded-t-lg shadow-lg w-full max-w-4xl">
      <!-- Title -->
      <div class="text-center mb-4">
        <h1 class="text-xl font-bold text-rose-500">Anthropic Web Based Chat Bot</h1>
      </div>

      <!-- Chat History Display -->
      <div
        ref="chatHistoryRef"
        class="chat-history overflow-y-auto p-3 bg-gray-900 rounded-lg mb-4 relative custom-scrollbar scroll-instant"
        :style="chatHistoryHeight"
        @scroll="handleScroll"
      >
        <!-- Initial welcome message -->
        <div class="AI mb-4">
          <strong>AI:</strong> Hi, how can I help you today?
        </div>
        
        <div v-for="(entry, index) in chatHistory" :key="index" :class="entry.sender + ' mb-4'">
          <strong>{{ entry.sender }}:</strong> 
          <div 
            v-if="entry.sender === 'AI'" 
            class="message-content" 
            v-html="formatMessage(entry.message)"
          ></div>
          <div v-else>{{ entry.message }}</div>
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
import { ref, nextTick, onMounted, computed } from 'vue';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

export default {
  setup() {
    const messageInput = ref('');
    const chatHistory = ref([]);
    const chatHistoryRef = ref(null);
    const messageInputRef = ref(null);
    const isNearBottom = ref(true);
    const isLoading = ref(false);

    const chatHistoryHeight = computed(() => {
      return { height: 'calc(100vh - 200px)' };
    });

    // Markdown and syntax highlighting formatter
    const formatMessage = (message) => {
      // Create a renderer that uses highlight.js for code blocks
      const renderer = new marked.Renderer();
      renderer.code = (code, language) => {
        const validLanguage = hljs.getLanguage(language) ? language : 'plaintext';
        const highlightedCode = hljs.highlight(validLanguage, code).value;
        return `<pre><code class="hljs ${validLanguage}">${highlightedCode}</code></pre>`;
      };

      // Configure marked with the custom renderer
      marked.setOptions({
        renderer: renderer,
        breaks: true,
        gfm: true,
      });

      // Convert markdown to HTML and sanitize to prevent XSS
      const htmlContent = marked(message);
      return DOMPurify.sanitize(htmlContent);
    };

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
              messageInputRef.value.focus();
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
      messageInputRef,
      isLoading,
      sendMessage,
      handleScroll,
      chatHistoryHeight,
      formatMessage,
    };
  },
};
</script>

<style scoped>
/* Existing styles with some modifications */
.chat-container {
  display: flex;
  flex-direction: column;
  min-height: 300px;
  max-height: 90vh;
}

.User {
  text-align: right;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 8px;
  padding: 10px;
}

.AI {
  text-align: left;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 10px;
  color: #e0e0e0;
}

.Error {
  text-align: center;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 8px;
  padding: 10px;
}

/* Syntax highlighting and code block styles */
.hljs {
  background: #2d2d2d !important;
  color: #cccccc;
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
}

.message-content {
  white-space: pre-wrap;
  word-wrap: break-word;
}

.message-content code {
  background-color: #3a3a3a;
  color: #e0e0e0;
  padding: 0.2rem 0.4rem;
  border-radius: 0.3rem;
  font-family: 'Courier New', monospace;
}

.message-content pre {
  margin: 1rem 0;
  border-radius: 0.5rem;
  overflow-x: auto;
}

/* Loading dots animation */
.loading-dots {
  display: flex;
  justify-content: center;
  gap: 4px;
}

.loading-dots span {
  width: 8px;
  height: 8px;
  background-color: #ffffff;
  border-radius: 50%;
  animation: loading 1.4s infinite ease-in-out both;
}

.loading-dots span:nth-child(1) { animation-delay: -0.32s; }
.loading-dots span:nth-child(2) { animation-delay: -0.16s; }

@keyframes loading {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1.0); }
}
</style>
