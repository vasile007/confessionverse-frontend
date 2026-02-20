import { useState } from "react";
import api from "../api";

export default function useVotes() {
  const [voteMap, setVoteMap] = useState(new Map());
  const [summaryMap, setSummaryMap] = useState(new Map());
  const [loadingVotes, setLoadingVotes] = useState(false);
  const [voteError, setVoteError] = useState("");

  const loadVotes = async (items = []) => {
    setLoadingVotes(true);
    setVoteError("");
    try {
      const summaryEntries = await Promise.all(
        (items || []).map(async (c) => {
          try {
            const res = await api.get(`/votes/${c.id}/summary`);
            return [c.id, res.data];
          } catch {
            return [c.id, null];
          }
        })
      );

      const userVoteEntries = await Promise.all(
        (items || []).map(async (c) => {
          try {
            const res = await api.get(`/votes/${c.id}/user-vote`);
            const liked = res.data?.liked;
            return [c.id, liked === true ? 1 : liked === false ? -1 : 0];
          } catch {
            return [c.id, 0];
          }
        })
      );

      setSummaryMap(new Map(summaryEntries));
      setVoteMap(new Map(userVoteEntries));
    } catch (err) {
      console.error(err);
      setVoteError("Unable to load your votes.");
    } finally {
      setLoadingVotes(false);
    }
  };

  return {
    voteMap,
    summaryMap,
    loadingVotes,
    voteError,
    loadVotes,
  };
}
