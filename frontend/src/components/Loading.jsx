import React from 'react'

export default function Loading({ message = 'Loading...', fullScreen = false }) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-700 font-medium">{message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p className="text-gray-600 text-sm">{message}</p>
    </div>
  )
}
