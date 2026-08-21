"use client";

import React from "react";
import { useStore } from "@/store/useStore";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiTrash2, FiLock, FiTruck, FiShield } from "react-icons/fi";
import Button from "./Button";

export default function CartDrawer() {
  const { cart, isCartOpen, setCartOpen, removeFromCart, updateQuantity } = useStore();

  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCartOpen(false)}
            className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm"
          />

          {/* Drawer Container */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 z-[101] w-full max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-lg uppercase tracking-wider text-slate-800">
                  Your Bag
                </h3>
                <p className="font-sans text-[10px] tracking-widest text-slate-500 mt-0.5">
                  {cart.length} item(s) secure
                </p>
              </div>
              <button
                onClick={() => setCartOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer text-slate-400 hover:text-slate-800"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <FiShield className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-sans text-sm text-slate-700 font-medium">Your bag is currently empty.</p>
                    <p className="font-sans text-[10px] text-slate-500 mt-1">Unlock premium outfits by browsing our collections.</p>
                  </div>
                  <Button variant="outline" className="mt-4" onClick={() => setCartOpen(false)}>
                    Browse Products
                  </Button>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={`${item.id}-${item.selectedSize}`}
                    className="flex gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-slate-300 transition-all duration-300"
                  >
                    {/* Item Thumbnail */}
                    <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center p-2 relative flex-shrink-0">
                      <img
                        src={item.image}
                        className="w-full h-full object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.06)]"
                        alt={item.name}
                      />
                    </div>

                    {/* Item Info */}
                    <div className="flex-1 flex flex-col justify-between text-left">
                      <div>
                        <h4 className="font-sans font-semibold text-[11px] text-slate-800 uppercase tracking-wider line-clamp-1">
                          {item.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[9px] uppercase tracking-widest text-accent-blue font-bold font-sans bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
                            Size: {item.selectedSize}
                          </span>
                        </div>
                      </div>

                      {/* Quantity & Delete */}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center border border-slate-200 rounded-full px-2 py-0.5 bg-slate-50">
                          <button
                            onClick={() => updateQuantity(item.id, item.selectedSize, item.quantity - 1)}
                            className="px-2 py-0.5 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                          >
                            -
                          </button>
                          <span className="px-2 text-xs font-sans text-slate-800">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.selectedSize, item.quantity + 1)}
                            className="px-2 py-0.5 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        <button
                          onClick={() => removeFromCart(item.id, item.selectedSize)}
                          className="p-1.5 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <p className="font-sans font-bold text-xs text-slate-800">
                        ₹{(item.price * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Summary */}
            {cart.length > 0 && (
              <div className="p-6 border-t border-slate-200 bg-white space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-sans text-slate-500">
                    <span>Shipping Logistics</span>
                    <span className="text-success font-medium flex items-center gap-1">
                      <FiTruck className="w-3.5 h-3.5" /> Complimentary
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-sans text-slate-500">
                    <span>GST (Included)</span>
                    <span className="text-slate-800">12%</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-100">
                    <span className="font-sans font-semibold text-xs text-slate-800 uppercase tracking-widest">
                      Bag Total
                    </span>
                    <span className="font-sans font-extrabold text-base text-accent-blue">
                      ₹{totalPrice.toLocaleString()} INR
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <button 
                    className="w-full py-4 bg-accent-blue text-white hover:bg-blue-700 flex items-center justify-center gap-2 rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer active:scale-98 transition-all"
                  >
                    <FiLock className="w-4 h-4" /> SECURE CHECKOUT
                  </button>
                  
                  <div className="flex items-center justify-center gap-4 text-[9px] text-slate-400 font-sans">
                    <span className="flex items-center gap-1">
                      <FiShield className="w-3.5 h-3.5" /> Handcrafted Quality
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    <span>Complimentary Exchanges</span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
