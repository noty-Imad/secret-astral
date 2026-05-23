import React, { Component } from "react";
import { GameState } from "../types";
import "./ActionTimer.css";

type ActionTimerProps = {
  gameState: GameState;
};

type ActionTimerState = {
  secondsLeft: number;
};

class ActionTimer extends Component<ActionTimerProps, ActionTimerState> {
  countdownID: NodeJS.Timeout | undefined;

  constructor(props: ActionTimerProps) {
    super(props);
    this.state = { secondsLeft: 0 };
  }

  componentDidMount() {
    this.syncTimer();
  }

  componentDidUpdate(prevProps: ActionTimerProps) {
    if (prevProps.gameState.actionTimerSecondsLeft !== this.props.gameState.actionTimerSecondsLeft ||
        prevProps.gameState.debateOpen !== this.props.gameState.debateOpen) {
      this.syncTimer();
    }
  }

  componentWillUnmount() {
    clearInterval(this.countdownID);
  }

  syncTimer() {
    clearInterval(this.countdownID);
    const seconds = this.props.gameState.actionTimerSecondsLeft ?? 0;
    const debateOpen = this.props.gameState.debateOpen ?? false;
    this.setState({ secondsLeft: seconds });

    // Don't count down while debate is open (timer is paused)
    if (seconds > 0 && !debateOpen) {
      this.countdownID = setInterval(() => {
        this.setState(prev => {
          const next = Math.max(0, prev.secondsLeft - 1);
          if (next <= 0) clearInterval(this.countdownID);
          return { secondsLeft: next };
        });
      }, 1000);
    }
  }

  render() {
    const { secondsLeft } = this.state;
    const debateOpen = this.props.gameState.debateOpen ?? false;
    if (secondsLeft <= 0) return null;

    const minutes = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    const display = `${minutes}:${secs.toString().padStart(2, "0")}`;
    const urgent = secondsLeft <= 30;

    return (
      <div className={`action-timer ${urgent ? "action-timer-urgent" : ""} ${debateOpen ? "action-timer-paused" : ""}`}>
        <span className="action-timer-icon">&#9200;</span>
        <span className="action-timer-text">{display}</span>
        {debateOpen && <span className="action-timer-paused-label">PAUSED</span>}
      </div>
    );
  }
}

export default ActionTimer;
