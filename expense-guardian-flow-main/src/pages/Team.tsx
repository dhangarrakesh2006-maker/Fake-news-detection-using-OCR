import AppLayout from "@/components/AppLayout";
import AddTeamMemberDialog from "@/components/AddTeamMemberDialog";
import { Users, ShieldCheck, Crown, User, ChevronDown, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

type AppRole = "admin" | "manager" | "employee" | "ceo";

interface TeamMember {
  user_id: string;
  full_name: string;
  email: string;
  department: string | null;
  avatar_url: string | null;
  roles: AppRole[];
}

const roleConfig: Record<AppRole, { icon: typeof Crown; label: string; color: string }> = {
  ceo: { icon: Star, label: "CEO", color: "text-accent" },
  admin: { icon: Crown, label: "Admin", color: "text-warning" },
  manager: { icon: ShieldCheck, label: "Manager", color: "text-primary" },
  employee: { icon: User, label: "Employee", color: "text-muted-foreground" },
};

export default function Team() {
  const { roles: currentUserRoles, user } = useAuth();
  const isAdmin = currentUserRoles.includes("admin") || currentUserRoles.includes("ceo");
  const queryClient = useQueryClient();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, department, avatar_url");

      if (error) throw error;

      const { data: allRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const roleMap = new Map<string, AppRole[]>();
      allRoles?.forEach((r) => {
        const list = roleMap.get(r.user_id) || [];
        list.push(r.role as AppRole);
        roleMap.set(r.user_id, list);
      });

      return (profiles || []).map((p) => ({
        ...p,
        roles: roleMap.get(p.user_id) || ["employee"],
      })) as TeamMember[];
    },
  });

  const changeRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      // Delete existing roles
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);
      if (deleteError) throw deleteError;

      // Insert new role
      const { error: insertError } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: newRole });
      if (insertError) throw insertError;
    },
    onSuccess: (_, { newRole }) => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast.success(`Role updated to ${roleConfig[newRole].label}`);
    },
    onError: () => {
      toast.error("Failed to update role");
    },
  });

  const getPrimaryRole = (roles: AppRole[]): AppRole =>
    roles.includes("ceo") ? "ceo" : roles.includes("admin") ? "admin" : roles.includes("manager") ? "manager" : "employee";

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-[1000px]">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">Team</h1>
              <p className="text-muted-foreground text-sm">
                Manage team members{isAdmin ? " and assign roles" : " and reporting lines"}
              </p>
            </div>
          </div>
          {isAdmin && <AddTeamMemberDialog />}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card rounded-xl p-4 h-16 animate-pulse bg-muted/20" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3">
            {members.map((member, i) => {
              const primary = getPrimaryRole(member.roles);
              const config = roleConfig[primary];
              const RoleIcon = config.icon;
              const isSelf = member.user_id === user?.id;

              return (
                <motion.div
                  key={member.user_id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="glass-card rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                      U
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        Team member
                        {isSelf && <span className="text-xs text-muted-foreground ml-2">(you)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.department || "No department"} · {member.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isAdmin && !isSelf ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                            <RoleIcon className={`w-3.5 h-3.5 ${config.color}`} />
                            {config.label}
                            <ChevronDown className="w-3 h-3 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {(["employee", "manager", "admin", "ceo"] as AppRole[]).map((role) => {
                            const rc = roleConfig[role];
                            const Icon = rc.icon;
                            return (
                              <DropdownMenuItem
                                key={role}
                                onClick={() => changeRole.mutate({ userId: member.user_id, newRole: role })}
                                disabled={primary === role}
                                className="gap-2"
                              >
                                <Icon className={`w-4 h-4 ${rc.color}`} />
                                {rc.label}
                                {primary === role && (
                                  <span className="ml-auto text-xs text-muted-foreground">current</span>
                                )}
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <span className={`flex items-center gap-1.5 text-xs font-medium ${config.color}`}>
                        <RoleIcon className="w-3.5 h-3.5" />
                        {config.label}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
