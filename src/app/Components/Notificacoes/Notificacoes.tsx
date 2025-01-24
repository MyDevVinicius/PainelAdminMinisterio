import { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaTrashAlt } from "react-icons/fa";
import { format } from "date-fns"; // Certifique-se de que o date-fns está instalado

// Definindo a interface da notificação
interface Notification {
  id: number;
  titulo: string;
  texto: string;
  autor: string;
  data_lancamento: string; // ou 'Date'
}

const NotificationList = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [author, setAuthor] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Buscar notificações do servidor
  useEffect(() => {
    const fetchNotifications = async () => {
      const response = await fetch("/api/notificacoes");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      } else {
        toast.error("Erro ao carregar notificações");
      }
    };

    fetchNotifications();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch("/api/notificacoes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          titulo: title,
          mensagem: message,
          autor: author,
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao criar notificação");
      }

      // Atualiza a lista de notificações após criação
      setTitle("");
      setMessage("");
      setAuthor("");
      setIsModalOpen(false);
      toast.success("Notificação criada com sucesso!");
    } catch (error) {
      toast.error("Erro ao criar notificação");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch("/api/notificacoes", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        throw new Error("Erro ao excluir notificação");
      }

      // Atualiza a lista de notificações após exclusão
      setNotifications(notifications.filter((notif) => notif.id !== id));
      toast.success("Notificação excluída com sucesso!");
    } catch (error) {
      toast.error("Erro ao excluir notificação");
    }
  };

  const handleOpenForm = () => {
    setIsModalOpen(true);
    setTitle("");
    setMessage("");
    setAuthor("");
  };

  const handleCloseForm = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="w-full p-6">
      {/* Botão de Adicionar Notificação */}
      <button
        onClick={handleOpenForm}
        className="rounded bg-media px-4 py-2 text-sm font-bold text-white lg:text-base mb-4"
      >
        + inserir Notificação
      </button>

      {/* Modal de Inserir Notificação */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full rounded-lg bg-white p-6 shadow-xl sm:w-3/4 md:w-1/2 lg:w-1/3">
            <h2 className="text-center text-lg font-bold sm:text-xl">
              Adicionar Notificação
            </h2>

            <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
              {/* Campo de Título */}
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título"
                required
                className="my-2 w-full border border-gray-300 p-2 text-sm font-bold text-black lg:text-base"
              />

              {/* Campo de Mensagem */}
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Mensagem"
                required
                className="my-2 w-full h-32 border border-gray-300 p-2 text-sm font-bold text-black lg:text-base"
              />

              {/* Campo de Autor */}
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Autor"
                required
                className="my-2 w-full border border-gray-300 p-2 text-sm font-bold text-black lg:text-base"
              />

              {/* Botões */}
              <div className="flex justify-between mt-4">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="rounded bg-red-600 px-4 py-2 text-sm text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded bg-media px-4 py-2 text-sm text-white"
                >
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabela de Notificações */}
      <div className="overflow-auto rounded-lg border border-gray-200 mt-6">
        <table className="min-w-full table-auto text-sm">
          <thead className="bg-media border">
            <tr>
              <th className="px-4 py-2 text-left border text-white">Título</th>
              <th className="px-4 py-2 text-center border text-white">
                Mensagem
              </th>
              <th className="px-4 py-2 text-center border text-white">Autor</th>
              <th className="px-4 py-2 text-center border text-white">
                Data de Lançamento
              </th>
              <th className="px-4 py-2 text-center border text-white">Ações</th>
            </tr>
          </thead>
          <tbody>
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <tr key={notification.id} className="border-t">
                  <td className="px-4 py-2">{notification.titulo}</td>
                  <td className="px-4 py-2 break-words">
                    {notification.texto}
                  </td>
                  <td className="px-4 py-2">{notification.autor}</td>
                  <td className="px-4 py-2">
                    {format(
                      new Date(notification.data_lancamento),
                      "dd/MM/yyyy"
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleDelete(notification.id)}
                      className="text-red-600"
                    >
                      <FaTrashAlt />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-4 text-center text-gray-600">
                  Não há notificações cadastradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ToastContainer position="top-right" />
    </div>
  );
};

export default NotificationList;
