"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ModeToggle } from "./mode-toggle";
import {
	LayoutDashboard,
	Search,
	BarChart3,
	Settings,
	FileText
} from "lucide-react";

export default function Header() {
	const pathname = usePathname();
	
	const links = [
		{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
		{ to: "/keywords", label: "Keywords", icon: Search },
		{ to: "/rankings", label: "Rankings", icon: BarChart3 },
		{ to: "/reports", label: "Reports", icon: FileText },
		{ to: "/settings", label: "Settings", icon: Settings },
	] as const;

	return (
		<div className="border-b">
			<div className="flex flex-row items-center justify-between px-8 h-16">
				<div className="flex items-center gap-8">
					<Link href="/dashboard" className="text-xl font-bold">
						Rankup
					</Link>
					<nav className="flex gap-6">
						{links.map(({ to, label, icon: Icon }) => {
							const isActive = pathname === to;
							return (
								<Link
									key={to}
									href={to}
									className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary ${
										isActive 
											? "text-primary border-b-2 border-primary pb-[22px] pt-[24px]" 
											: "text-muted-foreground"
									}`}
								>
									<Icon className="w-4 h-4" />
									{label}
								</Link>
							);
						})}
					</nav>
				</div>
				<div className="flex items-center gap-2">
					<ModeToggle />
				</div>
			</div>
		</div>
	);
}
