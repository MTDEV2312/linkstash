import React from 'react'

const FormError = ({ message }) => {
  if (!message) return null
  return (
    <div role="alert" className="mt-2 p-2 bg-red-50 border border-red-200 text-sm text-red-700 rounded">
      {message}
    </div>
  )
}

export default FormError
