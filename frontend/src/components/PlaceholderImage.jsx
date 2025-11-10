import { Image } from 'lucide-react'

const PlaceholderImage = ({ className = "w-40 h-40" }) => {
  return (
    <div className={`${className} bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center`}>
      <div className="text-center text-gray-400">
        <Image className="w-8 h-8 mx-auto mb-2" />
        <span className="text-sm">Sin imagen</span>
      </div>
    </div>
  )
}

export default PlaceholderImage