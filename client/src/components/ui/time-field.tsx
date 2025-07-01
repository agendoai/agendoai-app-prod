import React, { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface TimeFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  description?: string
  error?: string
  value: string
  onChange: (value: string) => void
}

export function TimeField({
  label,
  description,
  error,
  value,
  onChange,
  className,
  ...props
}: TimeFieldProps) {
  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('')

  // Quando o valor externo muda, atualizar horas e minutos
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':')
      setHours(h)
      setMinutes(m)
    }
  }, [value])

  // Quando horas ou minutos mudam internamente, emitir valor completo
  useEffect(() => {
    if (hours && minutes) {
      onChange(`${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`)
    }
  }, [hours, minutes, onChange])

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHours = e.target.value
    const numericValue = parseInt(newHours)
    if (newHours === '' || (numericValue >= 0 && numericValue < 24 && newHours.length <= 2)) {
      setHours(newHours)
    }
  }

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMinutes = e.target.value
    const numericValue = parseInt(newMinutes)
    if (newMinutes === '' || (numericValue >= 0 && numericValue < 60 && newMinutes.length <= 2)) {
      setMinutes(newMinutes)
    }
  }

  return (
    <div className={cn('space-y-1', className)}>
      {label && <Label>{label}</Label>}
      <div className="flex items-center">
        <Input
          value={hours}
          onChange={handleHoursChange}
          className="w-12 text-center mr-1"
          placeholder="00"
          maxLength={2}
          {...props}
        />
        <span className="mx-1">:</span>
        <Input
          value={minutes}
          onChange={handleMinutesChange}
          className="w-12 text-center ml-1"
          placeholder="00"
          maxLength={2}
          {...props}
        />
      </div>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}