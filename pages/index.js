import {Fragment, useEffect, useState} from 'react'
import { Menu, Transition } from '@headlessui/react'
import { MenuAlt1Icon, ViewListIcon, XIcon } from '@heroicons/react/outline'
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

  return (
  <div className="hidden mt-8 sm:block">
    <div className="align-middle inline-block min-w-full border-b border-gray-200">
      <table className="min-w-full">
        <thead>
        <tr className="border-t border-gray-200">
          <th className="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            <span className="lg:pl-2">Collector</span>
          </th>
          <th className="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            <span className="lg:pl-2">Timestamp</span>
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
        {data.map((item) => (
            <tr key={item.item_url}>
              <td className="px-6 py-3 whitespace-nowrap text-sm font-normal text-gray-900">
                  <a href={item.collector_url} className="truncate hover:text-gray-600">
                        {item.collector_id}
                  </a>
              </td>
              <td className="px-6 py-3 whitespace-nowrap text-sm font-normal text-gray-900">
                  {item.timestamp}
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
                <a href={item.item_url} className="text-indigo-600 hover:text-indigo-900">
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
            {/* Search header */}
            <div className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white border-b border-gray-200 lg:hidden">
              <button
                  type="button"
                  className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-purple-500 lg:hidden"
                  onClick={() => setSidebarOpen(true)}
              >
                <span className="sr-only">Open sidebar</span>
                <MenuAlt1Icon className="h-6 w-6" aria-hidden="true" />
              </button>
              <div className="flex-1 flex justify-between px-4 sm:px-6 lg:px-8">
                <div className="flex-1 flex">
                  <form className="w-full flex md:ml-0" action="#" method="GET">
                    <label htmlFor="search-field" className="sr-only">
                      Search
                    </label>
                    <div className="relative w-full text-gray-400 focus-within:text-gray-600">
                      <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
                        <SearchIcon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <input
                          id="search-field"
                          name="search-field"
                          className="block w-full h-full pl-8 pr-3 py-2 border-transparent text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-0 focus:border-transparent focus:placeholder-gray-400 sm:text-sm"
                          placeholder="Search"
                          type="search"
                      />
                    </div>
                  </form>
                </div>
                <div className="flex items-center">
                  {/* Profile dropdown */}
                  <Menu as="div" className="ml-3 relative">
                    <div>
                      <Menu.Button className="max-w-xs bg-white flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500">
                        <span className="sr-only">Open user menu</span>
                        <img
                            className="h-8 w-8 rounded-full"
                            src="https://images.unsplash.com/photo-1502685104226-ee32379fefbe?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                            alt=""
                        />
                      </Menu.Button>
                    </div>
                    <Transition
                        as={Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                    >
                      <Menu.Items className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-200 focus:outline-none">
                        <div className="py-1">
                          <Menu.Item>
                            {({ active }) => (
                                <a
                                    href="#"
                                    className={classNames(
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                        'block px-4 py-2 text-sm'
                                    )}
                                >
                                  View profile
                                </a>
                            )}
                          </Menu.Item>
                          <Menu.Item>
                            {({ active }) => (
                                <a
                                    href="#"
                                    className={classNames(
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                        'block px-4 py-2 text-sm'
                                    )}
                                >
                                  Settings
                                </a>
                            )}
                          </Menu.Item>
                          <Menu.Item>
                            {({ active }) => (
                                <a
                                    href="#"
                                    className={classNames(
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                        'block px-4 py-2 text-sm'
                                    )}
                                >
                                  Notifications
                                </a>
                            )}
                          </Menu.Item>
                        </div>
                        <div className="py-1">
                          <Menu.Item>
                            {({ active }) => (
                                <a
                                    href="#"
                                    className={classNames(
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                        'block px-4 py-2 text-sm'
                                    )}
                                >
                                  Get desktop app
                                </a>
                            )}
                          </Menu.Item>
                          <Menu.Item>
                            {({ active }) => (
                                <a
                                    href="#"
                                    className={classNames(
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                        'block px-4 py-2 text-sm'
                                    )}
                                >
                                  Support
                                </a>
                            )}
                          </Menu.Item>
                        </div>
                        <div className="py-1">
                          <Menu.Item>
                            {({ active }) => (
                                <a
                                    href="#"
                                    className={classNames(
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                        'block px-4 py-2 text-sm'
                                    )}
                                >
                                  Logout
                                </a>
                            )}
                          </Menu.Item>
                        </div>
                      </Menu.Items>
                    </Transition>
                  </Menu>
                </div>
              </div>
            </div>
            <main className="flex-1">
              {/* Page title & actions */}
              <div className="border-b border-gray-200 px-4 py-4 sm:flex sm:items-center sm:justify-between sm:px-6 lg:px-8">
                <div className="flex-1 min-w-0">
                  <p className="text-lg">
                    Query URL: <a href="https://api.broker.bgpkit.com/v2/latest"> https://api.broker.bgpkit.com/v2/latest </a>
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
