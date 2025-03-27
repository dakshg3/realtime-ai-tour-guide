import { useState } from "react";
import { Cloud, CloudOff, Mic, AlertCircle, RefreshCw, MapPin, Moon } from "react-feather";
import Button from "./Button";

function SessionStopped({ startSession, hasError, isConnecting }) {
  function handleStartSession() {
    if (isConnecting) return;
    startSession();
  }

  return (
    <div className="flex flex-col items-center justify-center w-full gap-4">
      <div className="text-center p-6 bg-gray-800 rounded-lg border border-gray-700 mb-4 shadow-md">
        <div className="flex justify-center mb-2">
          <div className="w-20 h-20 flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700 rounded-full shadow-lg mb-2">
            <MapPin className="text-white" size={36} />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white">India Tour Guide</h2>
        <p className="text-sm text-gray-300 mt-2">Your virtual guide to exploring the wonders of India</p>
        <div className="flex items-center justify-center gap-2 mt-3">
          <div className="flex items-center text-xs text-indigo-200 bg-indigo-900 px-2 py-1 rounded-full">
            <Moon size={12} className="mr-1" /> 
            <span>Taj Mahal</span>
          </div>
          <div className="flex items-center text-xs text-indigo-200 bg-indigo-900 px-2 py-1 rounded-full">
            <Moon size={12} className="mr-1" /> 
            <span>Kerala</span>
          </div>
          <div className="flex items-center text-xs text-indigo-200 bg-indigo-900 px-2 py-1 rounded-full">
            <Moon size={12} className="mr-1" /> 
            <span>Rajasthan</span>
          </div>
        </div>
      </div>
      
      {hasError && (
        <div className="p-3 bg-red-900 border border-red-800 rounded-lg w-full flex items-center gap-2 mb-2">
          <AlertCircle className="text-red-300" size={16} />
          <span className="text-sm text-red-200">Connection error. Please try connecting again.</span>
        </div>
      )}
      
      <Button
        onClick={handleStartSession}
        className={isConnecting ? "bg-gray-700" : hasError ? "bg-red-700" : "bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800"}
        icon={isConnecting ? <RefreshCw className="animate-spin" height={16} /> : <Cloud height={16} />}
      >
        {isConnecting ? "connecting..." : hasError ? "try again" : "start your tour guide"}
      </Button>
    </div>
  );
}

function SessionActive({ stopSession, hasError }) {
  return (
    <div className="flex flex-col items-center justify-center w-full gap-4">
      {hasError ? (
        <div className="p-4 rounded-lg bg-red-900 border border-red-800 flex items-center gap-2 w-full">
          <AlertCircle className="text-red-300" height={20} />
          <div>
            <div className="text-red-200">Connection error</div>
            <div className="text-xs text-red-300">Please disconnect and try connecting again</div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-lg bg-gray-800 border border-gray-700 flex flex-col gap-2 w-full shadow-md">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 to-purple-700 rounded-full flex items-center justify-center">
              <Mic className="text-white animate-pulse" height={20} />
            </div>
            <div>
              <div className="font-medium text-white">Tour Guide Listening...</div>
              <div className="text-xs text-gray-300">Try asking about the Taj Mahal or Kerala backwaters</div>
            </div>
          </div>
          <div className="text-xs text-center p-2 bg-indigo-900 border border-indigo-800 rounded-md text-indigo-200">
            <b>Pause for 2 seconds</b> after speaking to let your guide respond
          </div>
        </div>
      )}
      
      <div className="text-xs text-gray-300 p-4 bg-gray-800 border border-gray-700 rounded-md shadow-sm">
        <p className="font-semibold text-white mb-1">How to use your tour guide:</p>
        <ul className="list-disc pl-4 mt-1 space-y-1">
          <li>Speak clearly into your microphone</li>
          <li>You can speak continuously for longer questions</li>
          <li><b>Pause for 2 seconds</b> when you're done to let your guide respond</li>
          <li>The guide will automatically respond after detecting the pause</li>
          <li>Ask about destinations, attractions, festivals, or travel tips</li>
        </ul>
      </div>
      
      <Button onClick={stopSession} icon={<CloudOff height={16} />} className="bg-gray-700 hover:bg-gray-600">
        end tour session
      </Button>
    </div>
  );
}

export default function SessionControls({
  startSession,
  stopSession,
  isSessionActive,
  isConnecting,
  hasError,
}) {
  return (
    <div className="flex gap-4 p-4 h-full rounded-md">
      {isSessionActive ? (
        <SessionActive stopSession={stopSession} hasError={hasError} />
      ) : (
        <SessionStopped 
          startSession={startSession} 
          hasError={hasError} 
          isConnecting={isConnecting} 
        />
      )}
    </div>
  );
}
