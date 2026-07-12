import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'pets3_game_state_v1'
const MAX_HEARTS = 5
const HEART_REGEN_MINUTES = 30

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const state = JSON.parse(raw)
      // Regenerate hearts based on time elapsed
      const now = Date.now()
      const elapsed = (now - (state.lastHeartTime || now)) / (1000 * 60)
      const regenerated = Math.floor(elapsed / HEART_REGEN_MINUTES)
      if (regenerated > 0 && state.hearts < MAX_HEARTS) {
        state.hearts = Math.min(MAX_HEARTS, state.hearts + regenerated)
        state.lastHeartTime = now
      }
      return state
    }
  } catch (e) {
    console.error('Failed to load state', e)
  }
  return null
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.error('Failed to save state', e)
  }
}

function getDefaultState() {
  return {
    hearts: MAX_HEARTS,
    lastHeartTime: Date.now(),
    xp: 0,
    gems: 50,
    streak: 0,
    lastStudyDate: null,
    completedLevels: {}, // { 'vocab-1': { stars: 3, bestScore: 100 }, ... }
    sectionProgress: {
      vocabulary: 0, // highest unlocked level index
      grammar: 0,
      reading: 0,
      exam: 0,
    },
    dailyGoal: 20, // XP per day
    dailyXp: 0,
    dailyXpDate: null,
  }
}

export function useGameState() {
  const [state, setState] = useState(() => {
    const saved = loadState()
    if (saved) {
      // Check if it's a new day for daily XP
      const today = new Date().toDateString()
      if (saved.dailyXpDate !== today) {
        saved.dailyXp = 0
        saved.dailyXpDate = today
      }
      // Check streak
      const yesterday = new Date(Date.now() - 86400000).toDateString()
      if (saved.lastStudyDate === yesterday) {
        // streak continues
      } else if (saved.lastStudyDate !== today) {
        saved.streak = 0
      }
      return { ...getDefaultState(), ...saved }
    }
    return getDefaultState()
  })

  useEffect(() => {
    saveState(state)
  }, [state])

  // Lose a heart
  const loseHeart = useCallback(() => {
    setState(prev => ({
      ...prev,
      hearts: Math.max(0, prev.hearts - 1),
      lastHeartTime: prev.hearts === MAX_HEARTS ? Date.now() : prev.lastHeartTime,
    }))
  }, [])

  // Complete a level
  const completeLevel = useCallback((section, levelId, score, total, wrongCount) => {
    const stars = wrongCount === 0 ? 3 : wrongCount <= 2 ? 2 : 1
    const xpEarned = Math.round((score / total) * 20) + (stars === 3 ? 10 : 0)
    const today = new Date().toDateString()

    setState(prev => {
      const key = `${section}-${levelId}`
      const prevBest = prev.completedLevels[key]
      const isNewCompletion = !prevBest
      const bestStars = Math.max(stars, prevBest?.stars || 0)

      // Update streak
      let newStreak = prev.streak
      if (prev.lastStudyDate !== today) {
        const yesterday = new Date(Date.now() - 86400000).toDateString()
        if (prev.lastStudyDate === yesterday) {
          newStreak = prev.streak + 1
        } else {
          newStreak = 1
        }
      }

      // Update section progress
      const newSectionProgress = { ...prev.sectionProgress }
      const sectionLevels = {
        vocabulary: 10,
        grammar: 8,
        reading: 6,
        exam: 5,
      }
      const maxLevels = sectionLevels[section] || 0
      if (levelId <= maxLevels && levelId > newSectionProgress[section]) {
        newSectionProgress[section] = levelId
      }

      // Update daily XP
      let newDailyXp = prev.dailyXp
      let newDailyXpDate = prev.dailyXpDate
      if (newDailyXpDate !== today) {
        newDailyXp = 0
        newDailyXpDate = today
      }

      return {
        ...prev,
        xp: prev.xp + xpEarned,
        gems: prev.gems + (isNewCompletion ? 5 : 0),
        streak: newStreak,
        lastStudyDate: today,
        dailyXp: newDailyXp + xpEarned,
        dailyXpDate: today,
        completedLevels: {
          ...prev.completedLevels,
          [key]: { stars: bestStars, bestScore: Math.max(score, prevBest?.bestScore || 0) },
        },
        sectionProgress: newSectionProgress,
      }
    })

    return { stars, xpEarned }
  }, [])

  // Refill hearts (cost gems)
  const refillHearts = useCallback(() => {
    setState(prev => {
      if (prev.gems < 30 || prev.hearts >= MAX_HEARTS) return prev
      return {
        ...prev,
        hearts: MAX_HEARTS,
        gems: prev.gems - 30,
        lastHeartTime: Date.now(),
      }
    })
  }, [])

  // Check if a level is unlocked
  const isLevelUnlocked = useCallback((section, levelId) => {
    if (levelId === 1) return true
    return state.sectionProgress[section] >= levelId - 1
  }, [state])

  // Get level stars
  const getLevelStars = useCallback((section, levelId) => {
    return state.completedLevels[`${section}-${levelId}`]?.stars || 0
  }, [state])

  // Calculate user level from XP
  const userLevel = Math.floor(state.xp / 100) + 1
  const xpForNextLevel = (userLevel) * 100
  const xpProgress = state.xp % 100

  return {
    ...state,
    userLevel,
    xpProgress,
    xpForNextLevel,
    maxHearts: MAX_HEARTS,
    loseHeart,
    completeLevel,
    refillHearts,
    isLevelUnlocked,
    getLevelStars,
  }
}
