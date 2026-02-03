'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface CountdownResult {
  hours: number
  minutes: number
  seconds: number
  totalSeconds: number
  isExpired: boolean
  formatted: string
}

export function useCountdown(targetSeconds: number | null): CountdownResult {
  const [remaining, setRemaining] = useState<number>(targetSeconds ?? 0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (targetSeconds === null || targetSeconds <= 0) {
      setRemaining(0)
      return
    }

    setRemaining(targetSeconds)

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [targetSeconds])

  const hours = Math.floor(remaining / 3600)
  const minutes = Math.floor((remaining % 3600) / 60)
  const seconds = remaining % 60

  const formatted = `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`

  return {
    hours,
    minutes,
    seconds,
    totalSeconds: remaining,
    isExpired: remaining <= 0,
    formatted,
  }
}

export function useCountdownToDate(targetDate: Date | null): CountdownResult {
  const calculateSeconds = useCallback(() => {
    if (!targetDate) return 0
    const diff = targetDate.getTime() - Date.now()
    return Math.max(0, Math.floor(diff / 1000))
  }, [targetDate])

  const [remaining, setRemaining] = useState<number>(calculateSeconds)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!targetDate) {
      setRemaining(0)
      return
    }

    setRemaining(calculateSeconds())

    intervalRef.current = setInterval(() => {
      const newRemaining = calculateSeconds()
      setRemaining(newRemaining)

      if (newRemaining <= 0 && intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [targetDate, calculateSeconds])

  const hours = Math.floor(remaining / 3600)
  const minutes = Math.floor((remaining % 3600) / 60)
  const seconds = remaining % 60

  const formatted = `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`

  return {
    hours,
    minutes,
    seconds,
    totalSeconds: remaining,
    isExpired: remaining <= 0,
    formatted,
  }
}
