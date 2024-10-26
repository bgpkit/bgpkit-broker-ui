<script lang="ts">
    import moment from "moment";
    const { duration } = moment;

    let { last_updated_ts }: { last_updated_ts: string } = $props();

    let local_ts = toLocalTime(last_updated_ts + "Z");
    const last_check_ts = new Date(`${last_updated_ts}Z`);
    let diff = new Date().getTime() - last_check_ts.getTime();

    function toLocalTime(timeString: string) {
        const now = new Date(timeString);

        const offset = -now.getTimezoneOffset();
        const offsetSign = offset >= 0 ? "+" : "-";
        const offsetHours = Math.abs(Math.floor(offset / 60))
            .toString()
            .padStart(2, "0");
        const timeZone = `${offsetSign}${offsetHours}:00`;
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, "0");
        const day = now.getDate().toString().padStart(2, "0");
        const hour = now.getHours().toString().padStart(2, "0");
        const minute = now.getMinutes().toString().padStart(2, "0");
        const second = now.getSeconds().toString().padStart(2, "0");

        const dateTimeString = `${year}-${month}-${day}T${hour}:${minute}:${second}${timeZone}`;

        return dateTimeString;
    }
</script>

<div class="flex justify-between items-center">
    <div class="flex items-center">
        <a href="https://bgpkit.com">
            <img
                class="h-20 mr-8"
                src="https://spaces.bgpkit.org/assets/logos/icon-transparent.png"
                alt="bgpkit logo"
            />
        </a>
        <div>
            <h1 class="text-4xl">BGPKIT Broker Status</h1>
            <p class="text-xl">
                Last updated: {duration(diff / 1000, "seconds").humanize()} ago (GMT
                {last_updated_ts}Z) (Local {local_ts})
            </p>
        </div>
    </div>
    <div>
        <label class="flex cursor-pointer gap-2">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <circle cx="12" cy="12" r="5" />
                <path
                    d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"
                />
            </svg>
            <input
                type="checkbox"
                value="night"
                class="toggle theme-controller"
            />
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                ></path>
            </svg>
        </label>
    </div>
</div>
