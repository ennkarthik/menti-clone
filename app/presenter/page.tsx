'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function PresenterDashboard() {
  const [presentationId, setPresentationId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [questionType, setQuestionType] = useState<string>('multiple_choice');
  const [prompt, setPrompt] = useState<string>('');
  const [optionsText, setOptionsText] = useState<string>('Option A, Option B, Option C');
  
  const [isVotingOpen, setIsVotingOpen] = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    async function initPresentation() {
      const { data } = await supabase.from('presentations').select('*').limit(1);
      if (data && data.length > 0) {
        setPresentationId(data[0].id);
      } else {
        const { data: newPres } = await supabase
          .from('presentations')
          .insert([{ title: 'Live Lecture & Quiz' }])
          .select();
        if (newPres) setPresentationId(newPres[0].id);
      }
    }
    initPresentation();
  }, []);

  useEffect(() => {
    if (!presentationId) return;

    const channel = supabase
      .channel('live-votes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'votes' },
        (payload) => {
          const voteData = payload.new.payload;
          if (voteData && voteData.selectedOption) {
            setVoteCounts((prev) => ({
              ...prev,
              [voteData.selectedOption]: (prev[voteData.selectedOption] || 0) + 1,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [presentationId]);

  const updateState = async (open: boolean, results: boolean) => {
    if (!presentationId) return;
    setIsVotingOpen(open);
    setShowResults(results);

    const optionsArray = optionsText.split(',').map((o) => o.trim());
    const { data: interaction } = await supabase
      .from('page_interactions')
      .upsert({
        presentation_id: presentationId,
        page_number: currentPage,
        question_type: questionType,
        config: { prompt, options: optionsArray },
      })
      .select()
      .single();

    if (interaction) {
      await supabase.from('presentation_state').upsert({
        presentation_id: presentationId,
        current_page_number: currentPage,
        active_interaction_id: interaction.id,
        is_voting_open: open,
        show_results_to_audience: results,
        updated_at: new Date().toISOString(),
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-6 text-blue-400">Presenter Master Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-gray-800 p-6 rounded-lg space-y-4">
          <h2 className="text-xl font-semibold border-b border-gray-700 pb-2">Slide & Question Control</h2>
          
          <div>
            <label className="block text-sm text-gray-400">Current PDF Page Number</label>
            <input
              type="number"
              value={currentPage}
              onChange={(e) => setCurrentPage(Number(e.target.value))}
              className="w-full bg-gray-700 p-2 rounded mt-1"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400">Interaction Type</label>
            <select
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value)}
              className="w-full bg-gray-700 p-2 rounded mt-1"
            >
              <option value="multiple_choice">Multiple Choice Poll</option>
              <option value="word_cloud">Word Cloud</option>
              <option value="speed_quiz">Speed Quiz (Timed)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400">Question Prompt</label>
            <input
              type="text"
              placeholder="e.g., Which optimization algorithm was used?"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full bg-gray-700 p-2 rounded mt-1"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400">Options (Comma separated)</label>
            <input
              type="text"
              value={optionsText}
              onChange={(e) => setOptionsText(e.target.value)}
              className="w-full bg-gray-700 p-2 rounded mt-1"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              onClick={() => updateState(true, false)}
              className="flex-1 bg-green-600 hover:bg-green-700 font-bold py-2 rounded"
            >
              Start Voting
            </button>
            <button
              onClick={() => updateState(false, true)}
              className="flex-1 bg-yellow-600 hover:bg-yellow-700 font-bold py-2 rounded"
            >
              Reveal Results
            </button>
            <button
              onClick={() => updateState(false, false)}
              className="flex-1 bg-red-600 hover:bg-red-700 font-bold py-2 rounded"
            >
              Stop & Lock
            </button>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold border-b border-gray-700 pb-2 mb-4">Live incoming Votes</h2>
          <div className="space-y-3">
            {Object.keys(voteCounts).length === 0 ? (
              <p className="text-gray-400">No responses recorded for this session yet.</p>
            ) : (
              Object.entries(voteCounts).map(([opt, count]) => (
                <div key={opt} className="bg-gray-700 p-3 rounded flex justify-between">
                  <span>{opt}</span>
                  <span className="font-bold text-blue-400">{count} votes</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
