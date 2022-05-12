import SideBar from "./sidebar";

export default function Example() {
  return (
      <>
          <div className="min-h-full">

            <SideBar page={"search"}/>
          </div>
          <div className="lg:pl-64 flex flex-col">
          </div>
      </>
  )
}
