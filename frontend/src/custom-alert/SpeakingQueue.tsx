import React, { Component } from "react";
import { GameState, SendWSCommand, WSCommandType } from "../types";
import { SERVER_TIMEOUT } from "../constants";
import "./SpeakingQueue.css";

type SpeakingQueueProps = {
  gameState: GameState;
  sendWSCommand: SendWSCommand;
  user: string;
};

type SpeakingQueueState = {
  waitingForServer: boolean;
};

class SpeakingQueue extends Component<SpeakingQueueProps, SpeakingQueueState> {
  timeoutID: NodeJS.Timeout | undefined;

  constructor(props: SpeakingQueueProps) {
    super(props);
    this.state = { waitingForServer: false };
  }

  componentWillUnmount() {
    clearTimeout(this.timeoutID);
  }

  unlockAfterTimeout() {
    this.timeoutID = setTimeout(() => {
      this.setState({ waitingForServer: false });
    }, SERVER_TIMEOUT);
    this.setState({ waitingForServer: true });
  }

  onRequestSpeak = () => {
    this.unlockAfterTimeout();
    this.props.sendWSCommand({ command: WSCommandType.REQUEST_SPEAK });
  };

  onEndSpeak = () => {
    this.unlockAfterTimeout();
    this.props.sendWSCommand({ command: WSCommandType.END_SPEAK });
  };

  onCancelSpeak = () => {
    this.unlockAfterTimeout();
    this.props.sendWSCommand({ command: WSCommandType.CANCEL_SPEAK });
  };

  render() {
    const { gameState, user } = this.props;
    const { waitingForServer } = this.state;

    const currentSpeaker = gameState.currentSpeaker;
    const queue = gameState.speakingQueue || [];
    const speakCounts = gameState.speakCounts || {};
    const maxSpeaks = gameState.maxSpeaksPerRound || 2;
    const mySpeakCount = speakCounts[user] || 0;
    const isAlive = gameState.players[user]?.alive;

    const isSpeaking = currentSpeaker === user;
    const isInQueue = queue.includes(user);
    const canRequest = isAlive && !isSpeaking && !isInQueue && mySpeakCount < maxSpeaks;

    const queuePosition = queue.indexOf(user);

    return (
      <div className="speaking-queue-container">
        <div className="speaking-queue-header">
          <h3 className="speaking-queue-title">SPEAKING ORDER</h3>
          <span className="speaking-queue-speaks-left">
            {isAlive ? `${maxSpeaks - mySpeakCount}/${maxSpeaks} speaks left` : ""}
          </span>
        </div>

        {currentSpeaker && (
          <div className="speaking-queue-current">
            <span className="speaking-queue-mic">&#127908;</span>
            <span className="speaking-queue-speaker-name">
              {currentSpeaker}{currentSpeaker === user ? " (you)" : ""}
            </span>
            {isSpeaking && (
              <button
                className="speaking-queue-btn speaking-queue-btn-end"
                disabled={waitingForServer}
                onClick={this.onEndSpeak}
              >
                DONE
              </button>
            )}
          </div>
        )}

        {queue.length > 0 && (
          <div className="speaking-queue-list">
            <span className="speaking-queue-next-label">Next up:</span>
            {queue.map((name, i) => (
              <span key={name} className="speaking-queue-entry">
                {i + 1}. {name}{name === user ? " (you)" : ""}
              </span>
            ))}
          </div>
        )}

        {!currentSpeaker && queue.length === 0 && (
          <div className="speaking-queue-empty">
            No one is speaking. Request to speak!
          </div>
        )}

        <div className="speaking-queue-actions">
          {canRequest && (
            <button
              className="speaking-queue-btn speaking-queue-btn-request"
              disabled={waitingForServer}
              onClick={this.onRequestSpeak}
            >
              REQUEST TO SPEAK
            </button>
          )}
          {isInQueue && (
            <button
              className="speaking-queue-btn speaking-queue-btn-cancel"
              disabled={waitingForServer}
              onClick={this.onCancelSpeak}
            >
              CANCEL (#{queuePosition + 1} in queue)
            </button>
          )}
          {isSpeaking && (
            <span className="speaking-queue-you-speaking">You are speaking!</span>
          )}
        </div>
      </div>
    );
  }
}

export default SpeakingQueue;
