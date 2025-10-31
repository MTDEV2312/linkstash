import { useEffect, useState } from 'react'
import useTagStore from '../stores/tagStore'
import { toast } from 'react-hot-toast'
import { Plus } from 'lucide-react'
import TagCard from '../components/TagCard'

const Tags = () => {
	const { tags, isLoading, fetchTags, createTag, updateTag, deleteTag } = useTagStore()
	const [showForm, setShowForm] = useState(false)
	const [name, setName] = useState('')
	const [editingId, setEditingId] = useState(null)
	const [color, setColor] = useState('#6B7280')
	const [description, setDescription] = useState('')


	useEffect(() => {
		fetchTags()
	}, [fetchTags])

	const handleCreate = async (e) => {
		e.preventDefault()
		if (!name.trim()) return toast.error('Ingresa un nombre')
		try {
			const payload = { name: name.trim(), color: color || '#6B7280', description: description || '' }
			const res = await createTag(payload)
			if (res.success) {
				setName('')
				setColor('#6B7280')
				setDescription('')
				setShowForm(false)
			}
		} catch (err) {
			console.error(err)
			toast.error('No fue posible crear la etiqueta')
		}
	}

	const handleDelete = async (id) => {
		if (!confirm('¿Eliminar esta etiqueta?')) return
		try {
			const res = await deleteTag(id)
			if (res.success) {
				// nothing else needed, store updated
			}
		} catch (err) {
			console.error(err)
			toast.error('Error al eliminar etiqueta')
		}
	}

	const startEdit = (tag) => {
		setEditingId(tag._id)
		setName(tag.name)
		setColor(tag.color || '#6B7280')
		setDescription(tag.description || '')
		setShowForm(true)
	}

	const handleUpdate = async (e) => {
		e.preventDefault()
		if (!name.trim()) return toast.error('Ingresa un nombre')
		try {
			const payload = { name: name.trim(), color: color || '#6B7280', description: description || '' }
			const res = await updateTag(editingId, payload)
			if (res.success) {
				setName('')
				setEditingId(null)
				setColor('#6B7280')
				setDescription('')
				setShowForm(false)
			}
		} catch (err) {
			console.error(err)
			toast.error('No fue posible actualizar la etiqueta')
		}
	}

	const COLOR_PALETTE = [
		'#EF4444', // red
		'#F97316', // orange
		'#F59E0B', // amber
		'#EAB308', // yellow
		'#84CC16', // lime
		'#10B981', // green
		'#06B6D4', // cyan
		'#3B82F6', // blue
		'#7C3AED', // purple
		'#EC4899', // pink
		'#6B7280'  // gray (default)
	]

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Etiquetas</h1>
					<p className="text-gray-600">Organiza y administra tus etiquetas</p>
				</div>

				<div className="flex items-center gap-2">
					<button
						onClick={() => { setShowForm(!showForm); setName(''); setEditingId(null); setColor('#6B7280'); setDescription('') }}
						className="btn-primary btn-md flex items-center"
					>
						<Plus className="w-4 h-4 mr-2" />
						{showForm ? 'Cancelar' : 'Nueva etiqueta'}
					</button>
				</div>
			</div>

			{showForm && (
				<div className="card">
					<div className="card-content">
						<form onSubmit={editingId ? handleUpdate : handleCreate} className="flex flex-col sm:flex-row gap-2 items-start">
							<div className="flex-1 w-full">
								<input
									className="input w-full"
									placeholder="Nombre de la etiqueta"
									value={name}
									onChange={(e) => setName(e.target.value)}
								/>
								<textarea
									className="input w-full mt-2"
									placeholder="Descripción (opcional)"
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									rows={2}
								/>
								<div className="mt-2 flex items-center gap-3">
									<div className="text-sm text-gray-600">Color:</div>
									<div className="flex gap-2">
										{COLOR_PALETTE.map(c => (
											<button
												key={c}
												type="button"
												onClick={() => setColor(c)}
												className={`w-7 h-7 rounded-full border-2 ${color === c ? 'ring-2 ring-offset-1 ring-primary-500' : 'border-white'}`}
												style={{ backgroundColor: c }}
											/>
										))}
									</div>
									<input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="ml-2 h-8 w-10 p-0 rounded" />
								</div>
							</div>
							<div className="flex-shrink-0 self-stretch flex items-center">
								<button className="btn-primary btn-md" type="submit">
									{editingId ? 'Guardar' : 'Crear'}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Lista */}
			{isLoading ? (
				<div className="flex items-center justify-center h-40">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
				</div>
			) : tags.length === 0 ? (
				<div className="text-center py-12">
					<p className="text-gray-600">Aún no hay etiquetas. Crea la primera.</p>
				</div>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
					{tags.map((tag) => (
						<TagCard key={tag._id} tag={tag} onEdit={startEdit} onDelete={handleDelete} />
					))}
				</div>
			)}
		</div>
	)
}

export default Tags

