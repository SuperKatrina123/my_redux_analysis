import compose from './compose'

export default function applyMiddleware(...middlewares) {
  return createStore => (...args) => {
    // 创建一个store
    const store = createStore(...args)
    let dispatch = () => {
      throw new Error(
        'Dispatching while constructing your middleware is not allowed. ' +
          'Other middleware would not be applied to this dispatch.'
      )
    }
    
    // 下面的代码主要是对dispatch进行包装
	
    /*
    	middlewareAPI是一个对象，包含getState方法和dispatch方法（起到包装的作用）
    */
    const middlewareAPI = {
      getState: store.getState,
      dispatch: (...args) => dispatch(...args)   // 闭包
    }
    /*
    	我们知道，多个middlewares是采用链式调用的解构的
    	首先把每个middleware都包装成一个函数
    	然后很好地用到了compose函数，对这些中间件进行嵌套执行，初始参数为store.dispatch
    	store.dispatch --M1--> res1 --M2--> res2 --M3--> ... --M N--> final res   
    */
    // map： middleware -> middleware(middlewareAPI)，相当于返回的是middleware(middlewareAPI)一次调用后的结果
    // 具体看example_redux_thunk里的{dispatch, getState} => next => action => {}这个部分
    // 所以chain相当于是
    /*
    	[
    		(next) => (action) => {},            ---M1
    		(next) => (action) => {},            ---M2
    		(next) => (action) => {},            ---M3
    		...
    	]
    	
    	经过compose之后
    	dispath等于
    	M2(M1(M3(stroe.dispatch)))的结果  
    	
    	[这一步就是利用洋葱模型一步一步再包装dispatch]
    	
    	代入洋葱模型想一想是不是特别容易理解？
    
    */
    const chain = middlewares.map(middleware => middleware(middlewareAPI))  
    dispatch = compose(...chain)(store.dispatch)   // 利用中间件一层层包装dispatch，生成一个新的dispatch

    return {
      ...store,    // 对象解构
      dispatch     // 同名属性覆盖
    }
  }
}