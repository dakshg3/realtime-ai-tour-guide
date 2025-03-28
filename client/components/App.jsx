import { useEffect, useRef, useState } from "react";
import SessionControls from "./SessionControls";

export default function App() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [dataChannel, setDataChannel] = useState(null);
  const [connectionError, setConnectionError] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasActiveResponse, setHasActiveResponse] = useState(false);
  const peerConnection = useRef(null);
  const audioElement = useRef(null);
  const [debugLog, setDebugLog] = useState([]); // For debug purposes

  async function startSession() {
    // Prevent multiple connection attempts
    if (isConnecting || isSessionActive) {
      console.log("Session already active or connecting, ignoring duplicate start request");
      setDebugLog(prev => [...prev, `IGNORED: Duplicate connection request while ${isConnecting ? 'connecting' : 'active'}`]);
      return;
    }
    
    setIsConnecting(true);
    setConnectionError(false);
    
    // Clean up any existing connections first
    stopSession(false);
    
    // Get a session token for OpenAI Realtime API
    try {
      setDebugLog(prev => [...prev, `STARTING: New session initialization`]);
      const tokenResponse = await fetch("/token");
      const data = await tokenResponse.json();
      const EPHEMERAL_KEY = data.client_secret.value;

      // Create a peer connection
      const pc = new RTCPeerConnection();

      // Set up to play remote audio from the model
      audioElement.current = document.createElement("audio");
      audioElement.current.autoplay = true;
      pc.ontrack = (e) => (audioElement.current.srcObject = e.streams[0]);

      // Add local audio track for microphone input in the browser
      const ms = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      pc.addTrack(ms.getTracks()[0]);

      // Set up data channel for sending and receiving events
      const dc = pc.createDataChannel("oai-events");
      setDataChannel(dc);

      // Start the session using the Session Description Protocol (SDP)
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-12-17";
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          "Content-Type": "application/sdp",
        },
      });

      const answer = {
        type: "answer",
        sdp: await sdpResponse.text(),
      };
      await pc.setRemoteDescription(answer);

      peerConnection.current = pc;
    } catch (error) {
      console.error("Error setting up session:", error);
      setDebugLog(prev => [...prev, `SETUP ERROR: ${error.message}`]);
      setConnectionError(true);
      stopSession(true);
    } finally {
      setIsConnecting(false);
    }
  }

  // Stop current session, clean up peer connection and data channel
  function stopSession(clearLogs = true) {
    setDebugLog(prev => [...prev, `STOPPING: Session cleanup initiated`]);
    
    if (dataChannel) {
      try {
        if (dataChannel.readyState === "open") {
          dataChannel.close();
        }
      } catch (error) {
        console.error("Error closing data channel:", error);
      }
    }

    if (peerConnection.current) {
      try {
        peerConnection.current.getSenders().forEach((sender) => {
          if (sender.track) {
            sender.track.stop();
          }
        });
        peerConnection.current.close();
      } catch (error) {
        console.error("Error closing peer connection:", error);
      }
    }

    if (audioElement.current) {
      try {
        // Clean up audio element
        if (audioElement.current.srcObject) {
          const tracks = audioElement.current.srcObject.getTracks();
          tracks.forEach(track => track.stop());
          audioElement.current.srcObject = null;
        }
      } catch (error) {
        console.error("Error cleaning up audio:", error);
      }
    }

    setIsSessionActive(false);
    setDataChannel(null);
    peerConnection.current = null;
    setHasActiveResponse(false); // Reset active response state
    
    if (clearLogs) {
      setDebugLog([]); // Clear debug log only if explicitly requested
    }
  }

  // Check if data channel is open and ready
  function isDataChannelReady() {
    return dataChannel && dataChannel.readyState === "open";
  }

  // Send a message to the model
  function sendClientEvent(message) {
    if (isDataChannelReady()) {
      try {
        const timestamp = new Date().toLocaleTimeString();
        message.event_id = message.event_id || crypto.randomUUID();

        // Log outgoing message for debugging
        console.log("Sending to model:", message);
        setDebugLog(prev => [...prev, `SENT [${timestamp}]: ${JSON.stringify(message).substring(0, 100)}...`]);

        // send event before setting timestamp since the backend peer doesn't expect this field
        dataChannel.send(JSON.stringify(message));

        // if guard just in case the timestamp exists by miracle
        if (!message.timestamp) {
          message.timestamp = timestamp;
        }
        return true; // Message sent successfully
      } catch (error) {
        console.error("Error sending message:", error);
        setDebugLog(prev => [...prev, `SEND ERROR: ${error.message}`]);
        return false; // Failed to send message
      }
    } else {
      console.error(
        "Failed to send message - data channel not available or not open",
        message
      );
      setDebugLog(prev => [...prev, `ERROR: Data channel not ready - message not sent`]);
      return false; // Data channel not ready
    }
  }

  // Create a response only if one isn't already active
  function createResponse() {
    if (hasActiveResponse) {
      console.log("Response already active, ignoring duplicate create request");
      setDebugLog(prev => [...prev, `IGNORED: Response already active, not creating another`]);
      return false;
    }
    
    if (isDataChannelReady()) {
      console.log("Creating response");
      setHasActiveResponse(true);
      return sendClientEvent({ type: "response.create" });
    }
    
    return false;
  }

  // Initialize conversation with system message
  function initializeConversation() {
    if (!isDataChannelReady()) return false;
    
    // Send system message directly - there's no need for conversation.create
    if (isDataChannelReady()) {
      // Send the system message
      const systemMsgSent = sendClientEvent({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "system",
          content: [
            {
              type: "input_text",
              text: "You are a virtual tour guide specialized ONLY in Indian tourism. Greet the user and ask them what they would like to know about India, keep it very short and concise. Always respond promptly to any greeting or question about India. Do not answer questions not related to India. DO NOT TALK ABOUT ANYTHING ELSE."
            },
          ],
        },
      });
      
      if (!systemMsgSent) return false;
      
      // Create initial response to start listening
      setTimeout(() => {
        if (!isDataChannelReady()) return;
        
        console.log("Creating initial response");
        createResponse();
      }, 300);
      
      return true;
    }
    
    return false;
  }
  
  // Function to attempt recovery from certain errors
  function recoverSession() {
    if (!isDataChannelReady()) return false;
    
    setDebugLog(prev => [...prev, `Attempting session recovery...`]);
    
    // Reset active response state on recovery attempt
    setHasActiveResponse(false);
    
    // Send a recovery system message if needed
    const recoveryMsgSent = sendClientEvent({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "system",
        content: [
          {
            type: "input_text",
            text: "You are a virtual tour guide specialized in Indian tourism. Please respond to the user's question about India in a friendly and informative manner."
          },
        ],
      },
    });
    
    if (recoveryMsgSent) {
      // Only create a new response if there isn't one active
      setTimeout(() => {
        if (isDataChannelReady() && !hasActiveResponse) {
          console.log("Creating new response for recovery");
          createResponse();
        } else if (hasActiveResponse) {
          console.log("Response already active, skipping creation during recovery");
        }
      }, 300);
      
      return true;
    }
    
    return false;
  }

  // Attach event listeners to the data channel when a new one is created
  useEffect(() => {
    if (!dataChannel) return;
    
    const messageHandler = (e) => {
      try {
        const event = JSON.parse(e.data);
        const timestamp = new Date().toLocaleTimeString();
        
        // Log incoming messages for debugging
        console.log("Received from model:", event);
        setDebugLog(prev => [...prev, `RECEIVED [${timestamp}]: ${event.type}`]);
        
        // Mark response as complete when done
        if (event.type === "response.done") {
          setHasActiveResponse(false);
          
          // We don't need to create a new response after response.done
          // The turn detection (with silence_duration_ms: 2000) will create new responses
          // This prevents multiple open sessions
          console.log("Response done, waiting for next user input");
        }
        
        // If error occurs about active response, mark response as not active
        if (event.type === "error" && 
            event.error && 
            event.error.code === "conversation_already_has_active_response") {
          console.log("Received active response error, resetting state");
          setHasActiveResponse(true); // Mark as active since server thinks it is
          return; // Don't treat this as a connection error
        }
        
        // If error occurs, note it but don't try to recover - we'll handle reconnect elsewhere
        if (event.type === "error") {
          console.error("Received error event:", event);
          setDebugLog(prev => [...prev, `SERVER ERROR: ${JSON.stringify(event.error || {}).substring(0, 100)}...`]);
          
          if (event.error && event.error.message) {
            setDebugLog(prev => [...prev, `ERROR MESSAGE: ${event.error.message}`]);
            
            // Check for specific errors that we can recover from
            if (event.error.code === "invalid_value" && event.error.param && 
                (event.error.param.includes("type") || event.error.message.includes("must be 'input_text'"))) {
              setDebugLog(prev => [...prev, `Attempting to recover from parameter error...`]);
              
              // Try to recover the session with a short delay
              setTimeout(() => {
                if (isDataChannelReady()) {
                  recoverSession();
                }
              }, 500);
              
              // Don't set connection error in this case, as we're trying to recover
              return;
            }
          }
          
          setConnectionError(true);
        }
      } catch (error) {
        console.error("Error handling message:", error);
        setDebugLog(prev => [...prev, `PARSE ERROR: ${error.message}`]);
      }
    };
    
    const openHandler = () => {
      setIsSessionActive(true);
      setConnectionError(false);
      setHasActiveResponse(false); // Reset active response state on new connection
      console.log("Data channel opened, sending initial messages");
      setDebugLog(prev => [...prev, `CONNECTED: Data channel opened`]);
      
      // First, configure the session with updated turn detection settings
      setTimeout(() => {
        if (!isDataChannelReady()) return;
        
        // Send session update to configure turn detection
        sendClientEvent({
          type: "session.update",
          session: {
            turn_detection: {
              type: "server_vad",      // Voice Activity Detection
              threshold: 0.5,          // Sensitivity of speech detection
              prefix_padding_ms: 300,  // Include 300ms before speech starts
              silence_duration_ms: 2000, // Wait for 2 seconds of silence 
              create_response: true    // IMPORTANT: Auto-create response after silence
            }
          }
        });
        
        setDebugLog(prev => [...prev, `CONFIG: Turn detection set to wait for 2s silence and auto-create responses`]);
        
        // Initialize conversation with a short delay
        setTimeout(() => {
          initializeConversation();
        }, 300);
      }, 300);
    };
    
    const errorHandler = (error) => {
      console.error("Data channel error:", error);
      setDebugLog(prev => [...prev, `CONNECTION ERROR: ${error.message || "Unknown error"}`]);
      setConnectionError(true);
    };
    
    const closeHandler = () => {
      console.log("Data channel closed");
      setDebugLog(prev => [...prev, `DISCONNECTED: Data channel closed`]);
      setIsSessionActive(false);
      setConnectionError(true);
    };

    // Add event listeners
    dataChannel.addEventListener("message", messageHandler);
    dataChannel.addEventListener("open", openHandler);
    dataChannel.addEventListener("error", errorHandler);
    dataChannel.addEventListener("close", closeHandler);

    // Cleanup function
    return () => {
      dataChannel.removeEventListener("message", messageHandler);
      dataChannel.removeEventListener("open", openHandler);
      dataChannel.removeEventListener("error", errorHandler);
      dataChannel.removeEventListener("close", closeHandler);
    };
  }, [dataChannel]);

  // Global cleanup on component unmount
  useEffect(() => {
    // Cleanup function for component unmount
    return () => {
      console.log("Component unmounting, cleaning up all resources");
      stopSession(true);
    };
  }, []);

  return (
    <>
      <nav className="absolute top-0 left-0 right-0 h-16 flex items-center justify-center bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="text-2xl">🇮🇳</div>
          <h1 className="text-xl font-bold">India Tour Guide</h1>
        </div>
      </nav>
      <main className="absolute top-16 left-0 right-0 bottom-0 flex justify-center items-center bg-gray-900">
        <div className="w-96">
          <SessionControls
            startSession={startSession}
            stopSession={() => stopSession(true)}
            isSessionActive={isSessionActive}
            isConnecting={isConnecting}
            hasError={connectionError}
          />
        </div>
      </main>
    </>
  );
}
