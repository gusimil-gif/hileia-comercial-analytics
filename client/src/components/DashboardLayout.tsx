import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { GlobalFilters } from "@/components/GlobalFilters";
import { CommercialFiltersProvider } from "@/contexts/CommercialFilters";
import { useIsMobile } from "@/hooks/useMobile";
import { BarChart3, BadgeDollarSign, ClipboardCheck, FileBarChart2, FileUp, LayoutDashboard, LogOut, MapPinned, Settings2, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const menuItems = [
  { icon: LayoutDashboard, label: "Visão executiva", path: "/" }, { icon: FileUp, label: "Importações", path: "/importacoes" }, { icon: ClipboardCheck, label: "Conciliação", path: "/conciliacao" }, { icon: FileBarChart2, label: "Relatórios", path: "/relatorios" }, { icon: MapPinned, label: "Setores e Rotas", path: "/setores-rotas" }, { icon: Settings2, label: "Regras de classificação", path: "/regras-classificacao" }, { icon: BadgeDollarSign, label: "Verbas", path: "/verbas" }, { icon: BarChart3, label: "Qualidade dos dados", path: "/qualidade" }, { icon: ShieldCheck, label: "Auditoria", path: "/auditoria" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const authMode = trpc.auth.mode.useQuery();
  const login = trpc.auth.login.useMutation({ onSuccess: () => window.location.reload(), onError: error => toast.error(error.message) });
  if (loading || authMode.isLoading) return <div className="min-h-screen bg-[#fff8e8]" />;
  if (!user) return <main className="grid min-h-screen place-items-center bg-[#fff8e8] px-5"><section className="w-full max-w-md rounded-3xl bg-white p-9 shadow-[0_16px_50px_rgba(117,45,18,.14)]"><p className="text-xs font-bold tracking-[.18em] text-[#b42318]">HILÉIA</p><h1 className="mt-3 text-3xl font-bold text-[#1f2937]">Inteligência comercial, com rastreabilidade.</h1><p className="mt-3 text-sm leading-6 text-[#5b6472]">Entre para acessar os dados, as importações e os relatórios da Gerência Comercial.</p>{authMode.data?.external ? <form className="mt-6 space-y-3" onSubmit={event => { event.preventDefault(); login.mutate({ email, password }); }}><Input type="email" autoComplete="email" placeholder="E-mail administrativo" value={email} onChange={event => setEmail(event.target.value)} required/><Input type="password" autoComplete="current-password" placeholder="Senha" value={password} onChange={event => setPassword(event.target.value)} minLength={8} required/><Button type="submit" disabled={login.isPending} className="w-full bg-[#d71920] hover:bg-[#b42318]">{login.isPending ? "Entrando..." : "Entrar na plataforma"}</Button></form> : <Button className="mt-7 w-full bg-[#d71920] hover:bg-[#b42318]" onClick={() => startLogin()}>Entrar na plataforma</Button>}</section></main>;
  const active = menuItems.find(item => item.path === location)?.label ?? "Hiléia Comercial Analytics";
  return <CommercialFiltersProvider><SidebarProvider defaultOpen={!isMobile}><Sidebar className="border-r border-[#f0d9b4] bg-[#fffaf0]"><SidebarHeader className="h-auto px-4 pb-5 pt-6"><button onClick={() => setLocation("/")} className="flex items-center gap-3 text-left"><img src="/manus-storage/hileia-logo_1811e25b.png" alt="Hiléia" className="h-11 w-auto max-w-28 object-contain"/><span className="border-l border-[#f0d9b4] pl-3 text-xs font-semibold leading-4 text-[#5c3b21]">COMERCIAL<br/>ANALYTICS</span></button></SidebarHeader><SidebarContent className="px-2"><p className="px-3 pb-2 text-[10px] font-bold tracking-[.16em] text-[#a15b1a]">NAVEGAÇÃO</p><SidebarMenu>{menuItems.map(item => <SidebarMenuItem key={item.path}><SidebarMenuButton isActive={location === item.path} onClick={() => setLocation(item.path)} tooltip={item.label} className="h-10 rounded-xl text-[#5c3b21] data-[active=true]:bg-[#d71920] data-[active=true]:text-white"><item.icon className="h-4 w-4"/><span>{item.label}</span></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarContent><SidebarFooter className="border-t border-[#f0d9b4] p-3"><DropdownMenu><DropdownMenuTrigger asChild><button className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-[#fff0d5]"><Avatar className="h-9 w-9 border border-[#f0d9b4]"><AvatarFallback className="bg-[#f5c400] text-[#603813]">{user.name?.slice(0, 1).toUpperCase()}</AvatarFallback></Avatar><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-[#46301f]">{user.name || "Usuário"}</span><span className="block truncate text-xs text-[#8a6a50]">{user.role}</span></span></button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={logout} className="text-[#b42318]"><LogOut className="mr-2 h-4 w-4"/>Sair</DropdownMenuItem></DropdownMenuContent></DropdownMenu></SidebarFooter></Sidebar><SidebarInset className="bg-[#fff8e8]"><header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-[#f0dfc3] bg-[#fff8e8]/95 px-5 backdrop-blur"><SidebarTrigger className="md:hidden"/><div className="min-w-0"><p className="text-xs font-medium text-[#a15b1a]">Gerência Comercial</p><h1 className="truncate text-base font-bold text-[#1f2937]">{active}</h1></div><div className="ml-auto flex items-center gap-3"><GlobalFilters/><div className="hidden items-center gap-2 text-xs text-[#6d6259] sm:flex"><span className="h-2 w-2 rounded-full bg-[#16803c]"/> Ambiente protegido</div></div></header><main className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8">{children}</main></SidebarInset></SidebarProvider></CommercialFiltersProvider>;
}
