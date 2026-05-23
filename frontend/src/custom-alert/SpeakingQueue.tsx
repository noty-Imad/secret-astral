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
  secondsLeft: number;
};

class SpeakingQueue extends Component<SpeakingQueueProps, SpeakingQueueState> {
  timeoutID: NodeJS.Timeout | undefined;
  countdownID: NodeJS.Timeout | undefined;

  constructor(props: SpeakingQueueProps) {
    super(props);
    this.state = { waitingForServer: false, secondsLeft: 0 };
  }

  componentDidMount() {
    this.syncTimer();
  }

  componentDidUpdate(prevProps: SpeakingQueueProps) {
    const prev = prevProps.gameState;
    const curr = this.props.gameState;
    if (prev.currentSpeaker !== curr.currentSpeaker ||
        prev.speakerSecondsLeft !== curr.speakerSecondsLeft) {
      this.syncTimer();
    }
  }

  componentWillUnmount() {
    clearTimeout(this.timeoutID);
    clearInterval(this.countdownID);
  }

  syncTimer() {
    clearInterval(this.countdownID);
    const { gameState } = this.props;

    if (!gameState.currentSpeaker) {
      this.setState({ secondsLeft: 0 });
      return;
    }

    let seconds = gameState.speakerSecondsLeft ?? 0;
    this.setState({ secondsLeft: seconds });

    this.countdownID = setInterval(() => {
      this.setState(prev => {
        const next = Math.max(0, prev.secondsLeft - 1);
        if (next <= 0) clearInterval(this.countdownID);
        return { secondsLeft: next };
      });
    }, 1000);
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

  onOpenDebate = () => {
    this.unlockAfterTimeout();
    this.props.sendWSCommand({ command: WSCommandType.OPEN_DEBATE });
  };

  onCloseDebate = () => {
    this.unlockAfterTimeout();
    this.props.sendWSCommand({ command: WSCommandType.CLOSE_DEBATE });
  };

  onSkipDebate = () => {
    this.unlockAfterTimeout();
    this.props.sendWSCommand({ command: WSCommandType.OPEN_DEBATE });
    // Small delay to ensure open is processed before close
    setTimeout(() => {
      this.props.sendWSCommand({ command: WSCommandType.CLOSE_DEBATE });
    }, 300);
  };

  render() {
    const { gameState, user } = this.props;
    const { waitingForServer, secondsLeft } = this.state;

    const currentSpeaker = gameState.currentSpeaker;
    const queue = gameState.speakingQueue || [];
    const speakCounts = gameState.speakCounts || {};
    const maxSpeaks = gameState.maxSpeaksPerRound || 2;
    const mySpeakCount = speakCounts[user] || 0;
    const isAlive = gameState.players[user]?.alive;
    const debateOpen = gameState.debateOpen ?? false;
    const isPresident = gameState.president === user;

    const isSpeaking = currentSpeaker === user;
    const isInQueue = queue.includes(user);
    const canRequest = isAlive && !isSpeaking && !isInQueue && mySpeakCount < maxSpeaks;

    const queuePosition = queue.indexOf(user);
    const timerUrgent = secondsLeft > 0 && secondsLeft <= 10;

    return (
      <div className="speaking-queue-container">
        <div className="speaking-queue-header">
          <h3 className="speaking-queue-title">SPEAKING ORDER</h3>
          <span className="speaking-queue-speaks-left">
            {isAlive ? `${maxSpeaks - mySpeakCount}/${maxSpeaks} speaks left` : ""}
          </span>
        </div>

        {/* President debate controls */}
        {isPresident && (
          <div className="speaking-queue-debate-controls">
            {!debateOpen ? (
              <>
                <button
                  className="speaking-queue-btn speaking-queue-btn-debate-open"
                  disabled={waitingForServer}
                  onClick={this.onOpenDebate}
                >
                  OPEN DEBATE
                </button>
                <button
                  className="speaking-queue-btn speaking-queue-btn-debate-skip"
                  disabled={waitingForServer}
                  onClick={this.onSkipDebate}
                >
                  SKIP DEBATE
                </button>
              </>
            ) : (
              <button
                className="speaking-queue-btn speaking-queue-btn-debate-close"
                disabled={waitingForServer}
                onClick={this.onCloseDebate}
              >
                CLOSE DEBATE
              </button>
            )}
          </div>
        )}

        {!debateOpen && !isPresident && (
          <div className="speaking-queue-empty">
            Waiting for president to open debate...
          </div>
        )}

        {debateOpen && currentSpeaker && (
          <div className="speaking-queue-current">
            <span className="speaking-queue-mic">&#127908;</span>
            <span className="speaking-queue-speaker-name">
              {currentSpeaker}{currentSpeaker === user ? " (you)" : ""}
            </span>
            <span className={`speaking-queue-timer ${timerUrgent ? "speaking-queue-timer-urgent" : ""}`}>
              {secondsLeft}s
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

        {debateOpen && queue.length > 0 && (
          <div className="speaking-queue-list">
            <span className="speaking-queue-next-label">Next up:</span>
            {queue.map((name, i) => (
              <span key={name} className="speaking-queue-entry">
                {i + 1}. {name}{name === user ? " (you)" : ""}
              </span>
            ))}
          </div>
        )}

        {debateOpen && !currentSpeaker && queue.length === 0 && (
          <div className="speaking-queue-empty">
            Debate is open. Request to speak!
          </div>
        )}

        {debateOpen && (
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
        )}
      </div>
    );
  }
}

export default SpeakingQueue;
