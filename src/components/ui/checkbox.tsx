'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  description?: string
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, id, ...props }, ref) => {
    const inputId = id || React.useId()

    return (
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            type="checkbox"
            id={inputId}
            ref={ref}
            className={cn(
              'h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50',
              className
            )}
            {...props}
          />
        </div>
        {(label || description) && (
          <div className="ml-3 text-sm">
            {label && (
              <label
                htmlFor={inputId}
                className="font-medium text-foreground cursor-pointer"
              >
                {label}
              </label>
            )}
            {description && (
              <p className="text-muted-foreground">{description}</p>
            )}
          </div>
        )}
      </div>
    )
  }
)
Checkbox.displayName = 'Checkbox'

export { Checkbox }
