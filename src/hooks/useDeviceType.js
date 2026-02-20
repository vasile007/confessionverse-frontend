import { useEffect, useState } from "react";

export default function useDeviceType() {
    const [type, setType] = useState("desktop");

    useEffect(() => {
        const check = () => {
            const w = window.innerWidth;
            if (w < 640) setType("mobile");
            else if (w < 1024) setType("tablet");
            else setType("desktop");
        };
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    return type;
}
