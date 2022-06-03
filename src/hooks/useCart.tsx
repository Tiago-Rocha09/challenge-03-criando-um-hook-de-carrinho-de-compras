import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')//Buscar dados do localStorage

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const currentProduct = cart.find(product => product.id === productId);
      const newAmount = currentProduct?.amount ? currentProduct.amount + 1 : 1;
      const response = await api.get<Stock>(`/stock/${productId}`);

      if (response.data.amount < newAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (currentProduct) {
        const newCart = cart.map(product => {
          if (product.id === productId) {
            return { ...product, amount: newAmount };
          }
          return product;
        })
        setCart(newCart)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
      } else {
        const responseProduct = await api.get<Product>(`/products/${productId}`);
        const newProduct = {
          ...responseProduct.data,
          amount: newAmount
        }

        const newCart = [...cart, newProduct];

        setCart(newCart)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
      }

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExists = cart.find(product => product.id === productId);
      
      if (!productExists) {
        toast.error('Erro na remoção do produto');
        return;
      }
      
      const newCart = cart.filter( product => product.id !== productId);

      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) {
        return;
      }
      const response = await api.get<Stock>(`/stock/${productId}`);

      if (response.data.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      const newCart = cart.map(product => {
        if (product.id === productId) {
          return { ...product, amount };
        }
        return product;
      });
      setCart(newCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
