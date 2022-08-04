import {CollectionIcon, ServerIcon} from "@heroicons/react/outline";
// import {CodeIcon, ServerIcon} from "@heroicons/react/solid";

function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
}
export default function SideBar(props) {
    let navigation = [];
    navigation = [
        { name: 'MRT Files', href: 'mrt', target: "", icon: CollectionIcon, current: props.page==="mrt" },
        { name: 'Full-feed Peers', href: 'full-peers', target: "", icon: ServerIcon, current: props.page==="full-peers" },
        { name: 'All Peers', href: 'all-peers', target: "", icon: ServerIcon, current: props.page==="all-peers" },
    ]
    return (
        <>
            <div className="min-h-full">
                {/* Static sidebar for desktop */}
                <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:border-r lg:border-gray-200 lg:pt-5 lg:pb-4 lg:bg-gray-100">
                    <div className="flex items-center flex-shrink-0 px-6 h-8">
                        <a href="https://github.com/bgpkit" target="_blank" rel="noreferrer">BGPKIT</a>
                    </div>
                    {/* Sidebar component, swap this element with another sidebar if you like */}
                    <div className="mt-6 h-0 flex-1 flex flex-col overflow-y-auto">
                        {/* Navigation */}
                        <nav className="px-3 mt-6">
                            <div className="space-y-1">
                                {navigation.map((item) => (
                                    <a
                                        key={item.name}
                                        href={item.href}
                                        target={item.target}
                                        className={classNames(
                                            item.current ? 'bg-gray-200 text-gray-900' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50',
                                            'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
                                        )}
                                        aria-current={item.current ? 'page' : undefined}
                                    >
                                        <item.icon
                                            className={classNames(
                                                item.current ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500',
                                                'mr-3 flex-shrink-0 h-6 w-6'
                                            )}
                                            aria-hidden="true"
                                        />
                                        {item.name}
                                    </a>
                                ))}
                            </div>
                        </nav>
                    </div>
                </div>
            </div>
        </>
    )
}
