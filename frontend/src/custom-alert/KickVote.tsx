import React, { Component } from "react";
import { GameState, LobbyState, SendWSCommand, WSCommandType } from "../types";
import { SERVER_TIMEOUT } from "../constants";
import "./KickVote.css";

type KickVoteProps = {
  gameState: GameState;
  sendWSCommand: SendWSCommand;
  user: string;
};

type KickVoteState = {
  waitingForServer: boolean;
  showInitiateFor: string | null;
};

// States where the kick button should be hidden to avoid interfering with gameplay
const BUSY_STATES: LobbyState[] = [
  LobbyState.CHANCELLOR_VOTING,
  LobbyState.LEGISLATIVE_PRESIDENT,
  LobbyState.LEGISLATIVE_CHANCELLOR,
  LobbyState.LEGISLATIVE_PRESIDENT_VETO,
  LobbyState.PP_PEEK,
  LobbyState.PP_INVESTIGATE,
  LobbyState.PP_EXECUTION,
  LobbyState.PP_ELECTION,
  LobbyState.LIBERAL_VICTORY_POLICY,
  LobbyState.LIBERAL_VICTORY_EXECUTION,
  LobbyState.FASCIST_VICTORY_POLICY,
  LobbyState.FASCIST_VICTORY_ELECTION,
];

class KickVote extends Component<KickVoteProps, KickVoteState> {
  timeoutID: NodeJS.Timeout | undefined;

  constructor(props: KickVoteProps) {
    super(props);
    this.state = {
      waitingForServer: false,
      showInitiateFor: null,
    };
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

  onInitiateKick = (target: string) => {
    this.unlockAfterTimeout();
    this.setState({ showInitiateFor: null });
    this.props.sendWSCommand({
      command: WSCommandType.INITIATE_KICK,
      target: target,
    });
  };

  onVoteKick = (vote: boolean) => {
    this.unlockAfterTimeout();
    this.props.sendWSCommand({
      command: WSCommandType.VOTE_KICK,
      vote: vote,
    });
  };

  render() {
    const { gameState, user } = this.props;
    const { waitingForServer, showInitiateFor } = this.state;

    const kickVoteActive = gameState.kickVoteActive || false;
    const kickTarget = gameState.kickTarget || "";
    const kickVotes = gameState.kickVotes || {};
    const isAlive = gameState.players[user]?.alive;
    const hasVoted = kickVotes.hasOwnProperty(user);
    const isTarget = kickTarget === user;

    // Count votes
    let yesVotes = 0;
    let totalVotes = 0;
    for (const v of Object.values(kickVotes)) {
      totalVotes++;
      if (v) yesVotes++;
    }

    // Count eligible voters (all alive except target)
    let eligibleVoters = 0;
    for (const name of gameState.playerOrder) {
      if (gameState.players[name]?.alive && name !== kickTarget) {
        eligibleVoters++;
      }
    }

    // If there's an active kick vote, show the voting overlay
    if (kickVoteActive) {
      return (
        <div className="kick-vote-overlay">
          <div className="kick-vote-box">
            <h3 className="kick-vote-title">VOTE TO KICK</h3>
            <p className="kick-vote-target">
              Kick <strong>{kickTarget}</strong> from the game?
            </p>
            <p className="kick-vote-tally">
              Votes: {yesVotes} yes / {totalVotes - yesVotes} no ({totalVotes}/{eligibleVoters} voted)
            </p>

            {isAlive && !isTarget && !hasVoted && (
              <div className="kick-vote-buttons">
                <button
                  className="kick-vote-btn kick-vote-btn-yes"
                  disabled={waitingForServer}
                  onClick={() => this.onVoteKick(true)}
                >
                  KICK
                </button>
                <button
                  className="kick-vote-btn kick-vote-btn-no"
                  disabled={waitingForServer}
                  onClick={() => this.onVoteKick(false)}
                >
                  KEEP
                </button>
              </div>
            )}

            {hasVoted && (
              <p className="kick-vote-status">
                You voted {kickVotes[user] ? "KICK" : "KEEP"}. Waiting for others...
              </p>
            )}

            {isTarget && (
              <p className="kick-vote-status">
                A vote to kick you is in progress...
              </p>
            )}
          </div>
        </div>
      );
    }

    // Hide the kick button during busy game phases to avoid blocking gameplay
    if (BUSY_STATES.includes(gameState.state)) return null;

    // Only show for living players in an active game
    if (!isAlive) return null;

    // Get kickable players (alive, not self)
    const kickablePlayers = gameState.playerOrder.filter(
      (name) => gameState.players[name]?.alive && name !== user
    );

    // Count living players
    const livingCount = gameState.playerOrder.filter(
      (name) => gameState.players[name]?.alive
    ).length;

    if (livingCount <= 3) return null;

    return (
      <div className="kick-initiate-container">
        <button
          className="kick-initiate-toggle"
          onClick={() =>
            this.setState({
              showInitiateFor: showInitiateFor ? null : "open",
            })
          }
        >
          {showInitiateFor ? "Cancel" : "Vote to Kick"}
        </button>

        {showInitiateFor && (
          <div className="kick-initiate-list">
            <p className="kick-initiate-hint">
              Select a player to start a kick vote:
            </p>
            {kickablePlayers.map((name) => (
              <button
                key={name}
                className="kick-initiate-player-btn"
                disabled={waitingForServer}
                onClick={() => this.onInitiateKick(name)}
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
}

export default KickVote;
