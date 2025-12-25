import axios from 'axios';
import { useEffect, useState } from 'react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import config from '../config';
import { useAuth } from '../context/AuthContext';

const PlacementStatistics = () => {
    const { user } = useAuth();
    const [statsData, setStatsData] = useState({});
    const [selectedYear, setSelectedYear] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchPlacementStats();
    }, []);

    const fetchPlacementStats = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${config.API_URL}/stats/placements/stats`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
            
            console.log('📊 Stats received:', response.data.data);
            setStatsData(response.data.data);
            
            // Set default selected year to most recent
            const years = Object.keys(response.data.data);
            console.log('📅 Available years:', years);
            
            if (years.length > 0) {
                // Sort years in descending order (most recent first)
                const sortedYears = years.sort((a, b) => {
                    const yearA = parseInt(a.split('-')[0]);
                    const yearB = parseInt(b.split('-')[0]);
                    return yearB - yearA;
                });
                setSelectedYear(sortedYears[0]);
            }
        } catch (err) {
            setError('Failed to load placement statistics: ' + (err.response?.data?.msg || err.message));
            console.error('❌ Error:', err);
        } finally {
            setLoading(false);
        }
    };

    // Prepare data for pie chart
    const getPieChartData = () => {
        if (!selectedYear || !statsData[selectedYear]) return [];
        
        const branchData = statsData[selectedYear].branchWise;
        const data = Object.entries(branchData).map(([branch, count]) => ({
            name: branch,
            value: count
        }));
        
        console.log('📈 Pie chart data:', data);
        return data;
    };

    // Colors for pie chart segments
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <div className="text-lg text-gray-600">Loading placement statistics...</div>
        </div>
    );
    
    if (error) return (
        <div className="text-red-500 text-center py-8">
            <div className="font-semibold mb-2">Error</div>
            <div>{error}</div>
            <button 
                onClick={fetchPlacementStats}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
                Retry
            </button>
        </div>
    );

    const availableYears = Object.keys(statsData).sort((a, b) => {
        const yearA = parseInt(a.split('-')[0]);
        const yearB = parseInt(b.split('-')[0]);
        return yearB - yearA; // Most recent first
    });

    console.log('🎯 Selected year:', selectedYear);
    console.log('📅 All years:', availableYears);

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">Placement Statistics</h1>
            
            {/* Year Selection - FIXED DROPDOWN */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Academic Year
                </label>
                <div className="relative">
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="input w-full max-w-xs appearance-none bg-white pr-10"
                        style={{ cursor: 'pointer' }}
                    >
                        {availableYears.length === 0 ? (
                            <option value="">No data available</option>
                        ) : (
                            availableYears.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))
                        )}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                        </svg>
                    </div>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                    {availableYears.length} academic year{availableYears.length !== 1 ? 's' : ''} available
                </p>
            </div>

            {/* Pie Chart Section */}
            {selectedYear && statsData[selectedYear] && (
                <div className="card mb-8">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">
                        Placements by Branch ({selectedYear})
                        <span className="ml-2 text-sm font-normal text-gray-600">
                            Total: {getPieChartData().reduce((sum, item) => sum + item.value, 0)} placements
                        </span>
                    </h2>
                    
                    {getPieChartData().length > 0 ? (
                        <>
                            <div className="h-96">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={getPieChartData()}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={true}
                                            label={({ name, value }) => `${name}: ${value}`}
                                            outerRadius={150}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {getPieChartData().map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            formatter={(value, name) => [`${value} placements`, name]}
                                            labelFormatter={(label) => `Branch: ${label}`}
                                        />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            
                            {/* Branch Summary */}
                            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {getPieChartData().map((item, index) => (
                                    <div key={index} className="flex items-center p-3 bg-gray-50 rounded">
                                        <div 
                                            className="w-4 h-4 rounded mr-3" 
                                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                        ></div>
                                        <div className="flex-1">
                                            <span className="font-medium">{item.name}</span>
                                        </div>
                                        <div className="font-bold">{item.value}</div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            No placement data available for {selectedYear}
                        </div>
                    )}
                </div>
            )}

            {/* Placements Table */}
            {selectedYear && statsData[selectedYear] && statsData[selectedYear].placements && statsData[selectedYear].placements.length > 0 ? (
                <div className="card">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-800">
                            Placement Details ({selectedYear})
                        </h2>
                        <span className="text-sm text-gray-600">
                            {statsData[selectedYear].placements.length} student{statsData[selectedYear].placements.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Student Name</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Role</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Posted By:</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Branch</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {statsData[selectedYear].placements.map((placement, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {placement.studentName}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{placement.role}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{placement.PostedBy}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {placement.branch}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : selectedYear ? (
                <div className="card p-8 text-center text-gray-500">
                    No placement records found for {selectedYear}
                </div>
            ) : null}
        </div>
    );
};

export default PlacementStatistics;