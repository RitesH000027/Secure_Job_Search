import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { searchAPI } from '../services/api';

const SearchResults = () => {
	const [searchParams] = useSearchParams();
	const query = searchParams.get('q') || '';

	const [results, setResults] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	useEffect(() => {
		const loadResults = async () => {
			if (!query.trim()) {
				setResults([]);
				return;
			}

			try {
				setLoading(true);
				setError('');
				const response = await searchAPI.global(query.trim(), 30);
				setResults(response.data || []);
			} catch (err) {
				setError(err.response?.data?.detail || 'Failed to load search results');
				setResults([]);
			} finally {
				setLoading(false);
			}
		};

		loadResults();
	}, [query]);

	const groupedResults = useMemo(() => {
		return results.reduce(
			(accumulator, result) => {
				accumulator[result.result_type] = accumulator[result.result_type] || [];
				accumulator[result.result_type].push(result);
				return accumulator;
			},
			{}
		);
	}, [results]);

	const sections = [
		{ key: 'person', label: 'People' },
		{ key: 'company', label: 'Companies' },
		{ key: 'job', label: 'Jobs' },
	];

	return (
		<div className="space-y-5">
			<div className="li-card p-6">
				<h1 className="li-title">Search</h1>
				<p className="li-subtitle mt-2">Results for “{query || '...'}”</p>
			</div>

			{error && <div className="li-card border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
			{loading ? (
				<div className="li-card p-5 text-sm text-gray-600">Searching...</div>
			) : !query.trim() ? (
				<div className="li-card p-5 text-sm text-gray-600">Type a name, company, or job title in the top search bar.</div>
			) : results.length === 0 ? (
				<div className="li-card p-5 text-sm text-gray-600">No results found.</div>
			) : (
				<div className="space-y-4">
					{sections.map((section) => {
						const items = groupedResults[section.key] || [];
						if (items.length === 0) {
							return null;
						}

						return (
							<div key={section.key} className="li-card overflow-hidden">
								<div className="px-5 py-4 border-b border-gray-200 text-sm font-semibold text-gray-900">{section.label}</div>
								<div className="divide-y divide-gray-100">
									{items.map((item) => (
										<div key={`${item.result_type}-${item.id}`} className="p-5 space-y-1">
											<div className="flex items-start justify-between gap-3">
												<div>
													<Link to={item.url} className="text-base font-semibold text-[#0a66c2] hover:underline">
														{item.title}
													</Link>
													<p className="text-sm text-gray-500 mt-1">{item.subtitle}</p>
												</div>
												<span className="text-xs uppercase tracking-wide text-gray-500">{item.result_type}</span>
											</div>
											{item.description && <p className="text-sm text-gray-700">{item.description}</p>}
										</div>
									))}
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};

export default SearchResults;