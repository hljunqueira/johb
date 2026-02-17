import { useState } from "react";
import PropTypes from "prop-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Layers, Pencil, Trash2, Plus } from "lucide-react";
import { useMenus } from "@/hooks/useCardapioData";

MenusTab.propTypes = {
    headers: PropTypes.shape({
        Authorization: PropTypes.string.isRequired,
    }).isRequired,
};

export default function MenusTab({ headers }) {
    const { items: menus, create, update, remove } = useMenus(headers);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: "", description: "", active: true });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editing) {
                await update(editing, form);
            } else {
                await create(form);
            }
            setShowForm(false);
            setEditing(null);
            setForm({ name: "", description: "", active: true });
        } catch {
            // Error handled by hook
        }
    };

    const handleEdit = (menu) => {
        setEditing(menu.id);
        setForm({
            name: menu.name,
            description: menu.description || "",
            active: menu.active,
        });
        setShowForm(true);
    };

    const handleNew = () => {
        setEditing(null);
        setForm({ name: "", description: "", active: true });
        setShowForm(true);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <div>
                    <p className="text-sm text-muted-foreground">
                        Crie menus para organizar seu cardápio.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        Os menus agrupam categorias no cardápio público.
                    </p>
                </div>
                <Button
                    onClick={handleNew}
                    className="bg-primary text-white rounded-full"
                    data-testid="add-menu-btn"
                >
                    <Plus className="h-4 w-4 mr-1" />
                    Novo Menu
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {menus.map((menu) => (
                    <div
                        key={menu.id}
                        className="bg-white dark:bg-card rounded-2xl border border-border p-5"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h3 className="font-semibold font-heading">{menu.name}</h3>
                                <p className="text-xs text-muted-foreground">
                                    {menu.description}
                                </p>
                            </div>
                            <div className="flex gap-1">
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleEdit(menu)}
                                >
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="text-destructive"
                                    onClick={() => remove(menu.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                            <Badge
                                className={`rounded-full text-xs ${
                                    menu.active
                                        ? "bg-green-100 text-green-700"
                                        : "bg-gray-100 text-gray-600"
                                }`}
                            >
                                {menu.active ? "Ativo" : "Inativo"}
                            </Badge>
                        </div>
                    </div>
                ))}
            </div>

            {menus.length === 0 && (
                <div className="text-center py-12">
                    <Layers className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Nenhum menu criado</p>
                </div>
            )}

            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="font-heading">
                            {editing ? "Editar Menu" : "Novo Menu"}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label>Nome</Label>
                            <Input
                                value={form.name}
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, name: e.target.value }))
                                }
                                className="mt-1 rounded-lg"
                                required
                                data-testid="menu-name"
                            />
                        </div>
                        <div>
                            <Label>Descrição</Label>
                            <Input
                                value={form.description}
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, description: e.target.value }))
                                }
                                className="mt-1 rounded-lg"
                                data-testid="menu-desc"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={form.active}
                                onCheckedChange={(v) =>
                                    setForm((f) => ({ ...f, active: v }))
                                }
                            />
                            <span className="text-sm">Ativo</span>
                        </div>
                        <Button
                            type="submit"
                            className="w-full bg-primary text-white rounded-full"
                            data-testid="save-menu-btn"
                        >
                            {editing ? "Atualizar" : "Criar"}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
