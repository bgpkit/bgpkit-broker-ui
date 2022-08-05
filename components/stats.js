export default function Stats(props) {
    return (
        <div className="py-8 px-8">
            <dl className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-4">
                {props.stats.map((item) => (
                    <div key={item.name} className="px-4 py-5 bg-white shadow rounded-lg overflow-hidden sm:p-6">
                        <dt className="text-sm font-medium text-gray-500 truncate">{item.name}</dt>
                        <dd className="mt-1 text-3xl font-semibold text-gray-900">{item.stat}</dd>
                    </div>
                ))}
            </dl>
        </div>
    )
}