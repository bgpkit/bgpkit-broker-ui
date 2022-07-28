import {Fragment, useEffect, useState} from 'react'
import { Menu, Transition } from '@headlessui/react'
import { MenuAlt1Icon, ViewListIcon, XIcon, ExclamationIcon } from '@heroicons/react/outline'
import { SearchIcon} from '@heroicons/react/solid'
import {duration} from "moment";
import filesize from "file-size"
import SideBar from "./sidebar";

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

function Latest() {
  const [data, setData] = useState(null)
  const [isLoading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch('https://broker-latest.bgpkit.workers.dev')
        .then((res) => res.json())
        .then((data) => {
          setData(data)
          setLoading(false)
        })
  }, [])

  if (isLoading) return <p>Loading...</p>
  if (!data) return <p>No profile data</p>

  const icon_normal = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="green" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>

  const icon_warn = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="red" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>

  const icon_deprecated = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>

  for (let item of data) {
    item.bg = "";
    item.status = icon_normal;
    if (item.delay > 60*60*1 && item.data_type==="update") {
      // delay over 1 hour for updates files
      item.bg = "bg-yellow-500/10";
      item.status = icon_warn;
    } else if (item.delay > 60*60*24 && item.data_type==="rib"){
      // delay over 24 hour for RIB files
      item.bg = "bg-yellow-500/10";
      item.status = icon_warn;
    }

    if(["rrc02", "rrc08", "rrc09"].includes(item.collector_id)) {
      item.bg = "bg-gray-500/10";
      item.status = icon_deprecated
    }
  }

  return (
  <div className="mt-8 sm:block">
    <div className="align-middle inline-block min-w-full border-b border-gray-200">
      <table className="min-w-full">
        <thead>
        <tr className="border-t border-gray-200">
          <th className="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Collector
          </th>
          <th className="px-1 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Status
          </th>
          <th className="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            File Time UTC
          </th>
          <th className="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Data Type
          </th>
          <th className="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            File Size
          </th>
          <th className="hidden md:table-cell px-6 py-3 border-b border-gray-200 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
            Last update at
          </th>
          <th className="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            URL
          </th>
        </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
        { data.map((item) =>
            (
            <tr key={item.item_url} className={item.bg}>
              <td className={"px-6 py-3 whitespace-nowrap text-sm font-normal text-gray-500"}>
                  <a href={item.collector_url} className="truncate hover:text-gray-600">
                        {item.collector_id}
                  </a>
              </td>
              <td className="px-1 py-3 whitespace-nowrap text-sm font-normal text-gray-500">
                {item.status}
              </td>
              <td className="px-6 py-3 whitespace-nowrap text-sm font-normal text-gray-500">
                  {item.timestamp.split("T").join(" ")}
              </td>
              <td className="px-6 py-3 text-sm text-gray-500 font-normal">
                {item.data_type}
              </td>
              <td className="px-6 py-3 text-sm text-gray-500 font-normal">
                {filesize(item.rough_size).human('si')}
              </td>
                <td className="hidden md:table-cell px-6 py-3 whitespace-nowrap text-sm text-gray-500 text-right">
                  {duration(item.delay, 'seconds').humanize()} ago
                </td>
              <td className="px-6 py-3 text-sm text-gray-500 font-normal">
                <a href={item.item_url} className="text-indigo-600 hover:text-indigo-500">
                  Download
                </a>
              </td>
            </tr>
        ))}
        </tbody>
      </table>
    </div>
  </div>)
}

export default function Example() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
      <>
          <div className="min-h-full">

            <SideBar page={"latest"}/>

          {/* Main column */}
          <div className="lg:pl-64 flex flex-col">
            <div className="flex items-center flex-shrink-0 px-6 py-6 ">
              <img
                  className="h-8 w-auto"
                  src="https://spaces.bgpkit.org/assets/logos/icon-transparent.png"
                  alt="BGPKIT"
              />
              <a href="https://github.com/bgpkit" target="_blank"> BGPKIT  Broker V2 Latest Data </a>
            </div>
            <main className="flex-1">
              {/* Page title & actions */}
              <div className="border-b border-gray-200 px-4 py-4 sm:flex sm:items-center sm:justify-between sm:px-6 lg:px-8">
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    Data API: <a href="https://broker-latest.bgpkit.workers.dev/"> https://broker-latest.bgpkit.workers.dev/ </a>
                  </p>
                </div>
              </div>

              <Latest/>
            </main>
          </div>
        </div>
      </>
  )
}
