Rails.application.routes.draw do
  root 'pages#home'
  resources :pages
  resources :elements
  resources :users

end
