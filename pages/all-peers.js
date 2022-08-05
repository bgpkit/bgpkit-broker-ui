import React from "react";
import {duration} from "moment/moment";
import filesize from "file-size";
import SideBar from "../components/sidebar";
import Stats from "../components/stats";
const { useEffect, useState } = React;

function LatestPeers() {
    const [data, setData] = useState(null)
    const [isLoading, setLoading] = useState(false)

    useEffect(() => {
        setLoading(true)
        fetch('https://broker-latest.bgpkit.workers.dev/peers-all')
            .then((res) => res.json())
            .then((data) => {
                setData(data)
                setLoading(false)
            })
    }, [])

    if (isLoading) return <p>Loading...</p>
    if (!data) return <p>No profile data</p>
    let num_v4_pfxs = [];
    let num_v6_pfxs = [];
    let num_connected_asns = [];
    for(let item of data) {
        if(item.num_v4_pfxs>0){
            num_v4_pfxs.push(item.num_v4_pfxs);
        }
        if(item.num_v6_pfxs>0){
            num_v6_pfxs.push(item.num_v6_pfxs);
        }
        num_connected_asns.push(item.num_connected_asns);
    }
    const stats = [
        { name: '# of peers', stat:  data.length},
        { name: 'Avg. IPv4 Pfxs', stat: parseInt(num_v4_pfxs.reduce((a, b) => a + b, 0)/num_v4_pfxs.length) },
        { name: 'Avg. IPv6 Pfxs', stat: parseInt(num_v6_pfxs.reduce((a, b) => a + b, 0)/num_v6_pfxs.length) },
        { name: 'Avg. Connected ASNs', stat: parseInt(num_connected_asns.reduce((a, b) => a + b, 0)/num_connected_asns.length) },
    ]

    return (
        <div className="sm:block">

            <Stats stats={stats}></Stats>

            <div className="px-8 align-middle inline-block min-w-full border-b border-gray-200">
                <div className="container mx-auto mb-5">
                    <button
                        type="button"
                        className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        <a href="https://broker-latest.bgpkit.workers.dev/peers-all"
                           target="_blank" rel="noreferrer"
                            //className="text-indigo-600 hover:text-indigo-500 underline"
                        > Raw JSON API </a>
                    </button>
                    <button
                        type="button"
                        className="mx-5 inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        <a href="https://data.bgpkit.com/peer-stats"
                           target="_blank" rel="noreferrer"
                            // className="text-indigo-600 hover:text-indigo-500 underline"
                        > Historical Data Archive </a>
                    </button>
                </div>

                <table className="min-w-full">
                    <thead>
                    <tr className="border-t border-gray-200">
                        <th className="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                        </th>
                        <th className="px-1 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Collector
                        </th>
                        <th className="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            IP
                        </th>
                        <th className="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ASN
                        </th>
                        <th className="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            IPv4 Pfxs
                        </th>
                        <th className="hidden md:table-cell px-6 py-3 border-b border-gray-200 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            IPv6 Pfxs
                        </th>
                        <th className="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Connected ASNs
                        </th>
                    </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                    { data.map((item, itemIdx) =>
                        (
                            <tr key={itemIdx} className={itemIdx % 2 === 0 ? undefined : 'bg-gray-50'}>
                                <td className={"px-6 py-3 whitespace-nowrap text-sm font-normal text-gray-500"}>
                                    {item.date}
                                </td>
                                <td className="px-1 py-3 whitespace-nowrap text-sm font-normal text-gray-500">
                                    {item.collector}
                                </td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm font-normal text-gray-500">
                                    {item.ip}
                                </td>
                                <td className="px-6 py-3 text-sm text-gray-500 font-normal">
                                    {item.asn}
                                </td>
                                <td className={`px-6 py-3 text-sm text-gray-500 font-normal ${item.rough_size<100? "text-yellow-600": ""}`}>
                                    {item.num_v4_pfxs}
                                </td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500 text-right">
                                    {item.num_v6_pfxs}
                                </td>
                                <td className="px-6 py-3 text-sm text-gray-500 font-normal">
                                    {item.num_connected_asn}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>)
}

function PeersPage(){
    return (<>
        <div className="min-h-full">
            <SideBar page={"all-peers"}/>
            <div className="lg:pl-64 flex flex-col">
                <div className="flex items-center flex-shrink-0 px-6 py-6 ">
                    <img
                        className="h-8 w-auto"
                        src="https://spaces.bgpkit.org/assets/logos/icon-transparent.png"
                        alt="BGPKIT"
                    />
                    <a href="https://github.com/bgpkit" target="_blank" rel="noreferrer"> BGPKIT Broker Latest All Collector Peers </a>
                </div>
                <main className="flex-1">
                    <LatestPeers/>
                </main>
            </div>
        </div>
    </>)
}

export default PeersPage;